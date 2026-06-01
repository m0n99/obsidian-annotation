import { App, Component, MarkdownView, TFile } from 'obsidian'
import { preloadExcalidrawFonts } from './drawing/fonts'
import {
	SELECTION_HANDLE_SIZE,
	SVG_NS,
	TEXT_MARKDOWN_DEFAULT_FONT_SIZE,
	type AnnotationElement,
	type AnnotationPoint,
	type AnnotationStyle,
	type AnnotationTool,
	type AnnotationScene,
	type SelectionHandle,
	type TextAnnotationElement
} from './drawing/types'
import {
	constrainBoxSize,
	constrainLinearPoint,
	cursorForSelectionHandle,
	distance,
	elementBounds,
	rotationCenterForElement
} from './drawing/geometry'
import {
	absolutePoints,
	createBoxElement,
	createDraftElement,
	createFreeDrawElement,
	createLinearElement
} from './drawing/excalidraw-adapter'
import { isBoxElement } from './drawing/guards'
import {
	getEditorEl,
	getEditorOverlayHost,
	getEditorOverlayMount,
	sizeOverlayToDocumentPlane
} from './editor-dom'
import { duplicateElement, moveElementLayer, type LayerDirection } from './overlay/scene-commands'
import { renderOverlayToolbar } from './overlay/toolbar'
import type { AnnotationData } from './persistence'
import {
	ANNOTATION_DRAWING_CLASS,
	DOUBLE_CLICK_DISTANCE_PX,
	DOUBLE_CLICK_TIMEOUT_MS,
	type InteractionState,
	isAppLevelShortcut,
	isDebugEnabled,
	isEditableKeyboardTarget
} from './overlay/utils'
import {
	type OverlayRenderState,
	renderOverlayScene,
	updateMarkdownTextScale
} from './overlay/rendering'
import {
	OverlayTextEditor,
	type TextEditorHost
} from './overlay/text-editor'
import { createEraserCursor, resolveCursor } from './overlay/cursor'
import {
	cloneScene,
	defaultAnnotationStyle,
	emptyScene,
	isTrivialElement,
	normalizeElementGeometry,
	normalizeScene,
	styleForElement
} from './drawing/scene'
import {
	findElementAtPoint,
	findTextElementAtPoint,
	findSelectionHandleAtPoint,
	findEventTextElement
} from './overlay/hit-test'
import { pointerPoint, penPoint, logGeometry } from './overlay/pointer'
import { applyInteraction } from './overlay/interaction'
import { applyStyleUpdate, applyTextPropertyUpdate } from './overlay/style'
import {
	type SaveHost,
	scheduleSave as scheduleOverlaySave,
	flushSave as flushOverlaySave,
	saveScene,
	loadScene
} from './overlay/save'

export { ANNOTATION_DRAWING_CLASS } from './overlay/utils'

interface AnnotationPluginHost extends Component {
	readonly app: App
	readonly manifest: { dir?: string }
	loadAnnotationData(file: TFile): Promise<AnnotationData>
	saveAnnotationData(file: TFile, data: AnnotationData): Promise<void>
	getActiveAnnotationOverlay(): AnnotationEditorOverlay | null
}

export class AnnotationEditorOverlay {
	readonly rootEl: HTMLElement
	private readonly overlayHost: HTMLElement
	private readonly overlayMountEl: HTMLElement
	private readonly toolbarEl: HTMLElement
	private readonly stylePanelToggleEl: HTMLElement
	private readonly stylePanelEl: HTMLElement
	private readonly svgEl: SVGSVGElement
	private readonly resizeObserver: ResizeObserver
	private readonly textEditor = new OverlayTextEditor()
	private readonly eraserCursorFn: () => string
	private readonly saveHost: SaveHost
	private scene: AnnotationScene = emptyScene()
	private saveTimer: number | null = null
	private tool: AnnotationTool = 'select'
	private selectedId: string | null = null
	private draftElement: AnnotationElement | null = null
	private interaction: InteractionState | null = null
	private undoStack: AnnotationScene[] = []
	private redoStack: AnnotationScene[] = []
	private activePointerId: number | null = null
	private lastSelectClick: {
		time: number
		point: AnnotationPoint
		elementId: string | null
	} | null = null
	private hoverHandle: SelectionHandle | null = null
	private hoverElementId: string | null = null
	private readonly file: TFile | null
	private readonly filePath: string | null
	private markdownFontSizePx: number = TEXT_MARKDOWN_DEFAULT_FONT_SIZE
	private currentStyle: Required<AnnotationStyle> = defaultAnnotationStyle()
	private currentTextAlign: 'left' | 'center' | 'right' = 'left'
	private currentFontSize: number = TEXT_MARKDOWN_DEFAULT_FONT_SIZE
	private currentFontFamily: number = 1
	private mutationVersion = 0
	private isDrawingMode = false
	private isDestroyed = false
	private stylePanelOpen = false

	constructor(
		private readonly plugin: AnnotationPluginHost,
		private readonly view: MarkdownView
	) {
		void preloadExcalidrawFonts(plugin)

		this.file = view.file
		this.filePath = this.file?.path ?? null
		this.saveHost = plugin
		this.overlayHost = getEditorOverlayHost(view)
		this.overlayMountEl = getEditorOverlayMount(view)
		this.rootEl = this.overlayHost.createDiv({ cls: 'annotation-editor-overlay' })
		this.toolbarEl = (getEditorEl(view) ?? this.overlayHost).createDiv({
			cls: 'annotation-toolbar'
		})
		this.stylePanelToggleEl = (getEditorEl(view) ?? this.overlayHost).createDiv({
			cls: 'annotation-style-panel-toggle'
		})
		this.stylePanelEl = (getEditorEl(view) ?? this.overlayHost).createDiv({
			cls: 'annotation-style-panel'
		})
		this.svgEl = document.createElementNS(SVG_NS, 'svg')
		this.svgEl.addClass('annotation-svg-layer')
		this.rootEl.appendChild(this.svgEl)
		this.eraserCursorFn = createEraserCursor(view.contentEl)

		// Prevent text editor from losing focus when interacting with style controls
		const preventEditorBlur = () => {
			if (this.textEditor.isActive) {
				this.textEditor.preventBlur()
			}
		}
		this.stylePanelToggleEl.addEventListener('mousedown', preventEditorBlur)
		this.stylePanelEl.addEventListener('mousedown', preventEditorBlur)

		this.renderToolbar()
		this.resizeObserver = new ResizeObserver(() => this.resize())
		this.resizeObserver.observe(this.overlayHost)
		this.resizeObserver.observe(this.overlayMountEl)
		const editorEl = getEditorEl(view)
		if (editorEl) {
			this.resizeObserver.observe(editorEl)
		}

		this.overlayHost.addEventListener('scroll', this.handleHostScroll, { passive: true })
		this.svgEl.addEventListener('pointerdown', this.handlePointerDown)
		this.svgEl.addEventListener('pointermove', this.handlePointerMove)
		this.svgEl.addEventListener('pointerup', this.handlePointerUp)
		this.svgEl.addEventListener('pointercancel', this.handlePointerUp)
		this.svgEl.addEventListener('dblclick', this.handleDoubleClick)
		window.addEventListener('keydown', this.handleKeyDown, { capture: true })
		window.addEventListener('focus', this.handleWindowFocus)
		document.fonts?.addEventListener?.('loadingdone', this.handleFontLoadingDone)

		this.resize()
		this.renderScene()
		void this.load()
	}

	// -- Lifecycle --------------------------------------------------------

	setDrawingMode(enabled: boolean) {
		if (this.isDrawingMode === enabled) {
			return
		}

		this.isDrawingMode = enabled
		this.rootEl.toggleClass('is-drawing', enabled)
		this.toolbarEl.toggleClass('is-drawing', enabled)
		this.stylePanelToggleEl.toggleClass('is-drawing', enabled)
		this.stylePanelEl.toggleClass('is-drawing', enabled)
		this.view.contentEl.toggleClass(ANNOTATION_DRAWING_CLASS, enabled)
		if (!enabled) {
			this.selectedId = null
			this.draftElement = null
			this.interaction = null
			this.activePointerId = null
			this.textEditor.cancel()
		}
		this.renderScene()
	}

	isForFile(file: TFile | null) {
		return this.filePath === (file?.path ?? null)
	}

	destroy() {
		this.isDestroyed = true
		this.flushSave()
		this.resizeObserver.disconnect()
		this.overlayHost.removeEventListener('scroll', this.handleHostScroll)
		this.svgEl.removeEventListener('pointerdown', this.handlePointerDown)
		this.svgEl.removeEventListener('pointermove', this.handlePointerMove)
		this.svgEl.removeEventListener('pointerup', this.handlePointerUp)
		this.svgEl.removeEventListener('pointercancel', this.handlePointerUp)
		this.svgEl.removeEventListener('dblclick', this.handleDoubleClick)
		window.removeEventListener('keydown', this.handleKeyDown, true)
		window.removeEventListener('focus', this.handleWindowFocus)
		document.fonts?.removeEventListener?.('loadingdone', this.handleFontLoadingDone)
		this.textEditor.cancel()
		this.view.contentEl.removeClass(ANNOTATION_DRAWING_CLASS)
		this.toolbarEl.remove()
		this.stylePanelToggleEl.remove()
		this.stylePanelEl.remove()
		this.rootEl.remove()
	}

	resize() {
		this.markdownFontSizePx = updateMarkdownTextScale(this.view, TEXT_MARKDOWN_DEFAULT_FONT_SIZE)
		sizeOverlayToDocumentPlane(
			this.view,
			this.overlayHost,
			this.overlayMountEl,
			this.rootEl,
			this.svgEl
		)
	}

	// -- Toolbar ----------------------------------------------------------

	private renderToolbar() {
		const selected = this.selectedId
			? this.scene.elements.find((element) => element.id === this.selectedId)
			: null
		const isTextSel = selected !== null && selected !== undefined && selected.type === 'text'
		const isTextTool = this.tool === 'text'

		// Sync current text style from selected text element
		if (isTextSel && selected.type === 'text') {
			this.currentTextAlign = selected.textAlign ?? 'left'
			this.currentFontSize = selected.fontSize ?? TEXT_MARKDOWN_DEFAULT_FONT_SIZE
			this.currentFontFamily = selected.fontFamily ?? 1
		}

		// Show text style controls when tool is text or a text element is selected
		const useTextStyle = isTextTool || isTextSel
		const textStyleState = useTextStyle
			? isTextSel && selected.type === 'text'
				? {
						style: styleForElement(selected),
						textAlign: selected.textAlign ?? 'left',
						fontSize: selected.fontSize ?? TEXT_MARKDOWN_DEFAULT_FONT_SIZE,
						fontFamily: selected.fontFamily ?? 1
					}
				: {
						style: this.currentStyle,
						textAlign: this.currentTextAlign,
						fontSize: this.currentFontSize,
						fontFamily: this.currentFontFamily
					}
			: undefined

		renderOverlayToolbar(
			this.toolbarEl,
			this.stylePanelToggleEl,
			this.stylePanelEl,
			{
				tool: this.tool,
				style: this.styleForOptionsPane(),
				hasSelection: this.selectedId !== null,
				isTextSelection: isTextSel,
				isTextTool,
				textStyle: textStyleState,
				stylePanelOpen: this.stylePanelOpen
			},
			{
				selectTool: (tool) => {
					this.tool = tool
					this.selectedId = null
					this.draftElement = null
					this.interaction = null
					this.resetHoverState()
					this.textEditor.cancel()
					this.renderToolbar()
					this.renderScene()
				},
				updateStyle: (style) => {
					this.applyOverlayStyleUpdate(style)
					this.renderToolbar()
					this.renderScene()
				},
				updateOpacity: (opacity) => {
					this.applyOverlayStyleUpdate({ opacity })
					this.renderScene()
				},
				updateTextAlign: (align) => {
					this.applyOverlayTextPropertyUpdate({ textAlign: align })
					this.renderToolbar()
					this.renderScene()
				},
				updateFontSize: (size) => {
					this.applyOverlayTextPropertyUpdate({ fontSize: size })
					this.renderToolbar()
					this.renderScene()
				},
				updateFontFamily: (family) => {
					this.applyOverlayTextPropertyUpdate({ fontFamily: family })
					this.renderToolbar()
					this.renderScene()
				},
				duplicateSelected: () => {
					this.duplicateSelected()
					this.renderToolbar()
				},
				deleteSelected: () => {
					this.deleteSelected()
					this.renderToolbar()
				},
				moveLayer: (direction) => {
					if (direction === 'front') {
						this.moveSelectedLayer('front')
					} else if (direction === 'forward') {
						this.moveSelectedLayer('forward')
					} else if (direction === 'backward') {
						this.moveSelectedLayer('backward')
					} else {
						this.moveSelectedLayer('back')
					}
					this.renderToolbar()
				},
				toggleStylePanel: () => {
					this.stylePanelOpen = !this.stylePanelOpen
					this.renderToolbar()
				}
			}
		)
	}

	// -- Event handlers ---------------------------------------------------

	private handleHostScroll = () => {
		this.resize()
	}

	private handleWindowFocus = () => {
		this.resize()
		this.renderScene()
	}

	private handleFontLoadingDone = () => {
		if (this.isDestroyed) {
			return
		}
		this.renderScene()
	}

	private handleKeyDown = (event: KeyboardEvent) => {
		if (
			!this.isDrawingMode ||
			this.plugin.getActiveAnnotationOverlay() !== this ||
			(this.isOverlayKeyboardTarget(event.target) && isEditableKeyboardTarget(event.target))
		) {
			return
		}
		if (isAppLevelShortcut(event)) {
			return
		}

		if (this.handleToolShortcut(event) || this.handleUndoRedoShortcut(event)) {
			event.stopPropagation()
			return
		}

		if (this.selectedId && (event.key === 'Delete' || event.key === 'Backspace')) {
			event.preventDefault()
			event.stopPropagation()
			this.deleteSelected()
			return
		}

		event.preventDefault()
		event.stopPropagation()
	}

	private isOverlayKeyboardTarget(target: EventTarget | null) {
		return (
			target instanceof Node &&
			(this.rootEl.contains(target) ||
				this.toolbarEl.contains(target) ||
				this.stylePanelToggleEl.contains(target) ||
				this.stylePanelEl.contains(target))
		)
	}

	private isStyleControlTarget(target: EventTarget | null) {
		return (
			target instanceof Node &&
			(this.stylePanelToggleEl.contains(target) || this.stylePanelEl.contains(target))
		)
	}

	private handlePointerDown = (event: PointerEvent) => {
		if (!this.isDrawingMode || event.button !== 0) {
			return
		}

		if (this.textEditor.isActive && event.target !== this.textEditor.currentTextarea) {
			if (this.isStyleControlTarget(event.target)) {
				this.textEditor.preventBlur()
			} else {
				this.textEditor.commit()
			}
		}

		event.preventDefault()
		event.stopPropagation()
		const point = pointerPoint(this.svgEl, event)

		if (isDebugEnabled()) {
			logGeometry(this.svgEl, this.overlayMountEl, this.overlayHost, 'pointerdown', event, point)
		}

		if (this.tool === 'select') {
			const selected = findElementAtPoint(this.scene, point)
			this.selectedId = selected?.id ?? null
			if (selected?.type === 'text' && this.isSelectDoubleClick(point, selected.id, event)) {
				this.startInlineTextEditor(selected)
				this.renderToolbar()
				this.renderScene()
				return
			}
			this.rememberSelectClick(point, selected?.id ?? null, event)

			const handle = findSelectionHandleAtPoint(this.scene, this.selectedId, point)
			if (this.selectedId && handle) {
				const selectedElement = this.scene.elements.find(
					(element) => element.id === this.selectedId
				)
				const rotationCenter = selectedElement
					? rotationCenterForElement(selectedElement)
					: undefined
				const startBounds = selectedElement
					? (elementBounds(selectedElement) ?? undefined)
					: undefined
				this.startPointerCapture(event)
				this.interaction = {
					type: handle === 'rotation' ? 'rotate' : 'resize',
					elementId: this.selectedId,
					startPoint: point,
					baseScene: cloneScene(this.scene),
					handle,
					didMutate: false,
					lockAspectRatio: event.shiftKey,
					startBounds,
					rotationCenter,
					startAngle: selectedElement?.angle ?? 0,
					startPointerAngle: rotationCenter
						? Math.atan2(point.y - rotationCenter.y, point.x - rotationCenter.x)
						: undefined
				}
				return
			}

			if (selected) {
				this.startPointerCapture(event)
				this.interaction = {
					type: 'move',
					elementId: selected.id,
					startPoint: point,
					baseScene: cloneScene(this.scene),
					didMutate: false
				}
			}
			this.renderToolbar()
			this.renderScene()
			return
		}

		if (this.tool === 'text') {
			const selected = findTextElementAtPoint(this.scene, point)
			if (selected) {
				this.selectedId = selected.id
				this.startInlineTextEditor(selected)
				this.renderToolbar()
				this.renderScene()
			} else {
				this.startInlineTextEditor(point)
			}
			return
		}

		if (this.tool === 'eraser') {
			const selected = findElementAtPoint(this.scene, point)
			if (selected) {
				this.commitSceneMutation({
					elements: this.scene.elements.filter((element) => element.id !== selected.id)
				})
				this.selectedId = null
				this.renderToolbar()
				this.renderScene()
			}
			return
		}

		if (this.tool === 'image') {
			return
		}

		this.startPointerCapture(event)
		this.selectedId = null
		this.draftElement = createDraftElement(
			this.tool,
			penPoint(point, event),
			this.styleForNewElement(),
			event
		)
		this.renderToolbar()
		this.renderScene()
	}

	private handleDoubleClick = (event: MouseEvent) => {
		if (!this.isDrawingMode || this.tool !== 'select') {
			return
		}

		const selected =
			findEventTextElement(this.scene, event) ?? findElementAtPoint(this.scene, pointerPoint(this.svgEl, event))
		if (selected?.type !== 'text') {
			return
		}

		event.preventDefault()
		event.stopPropagation()
		this.selectedId = selected.id
		this.interaction = null
		this.draftElement = null
		this.activePointerId = null
		this.startInlineTextEditor(selected)
		this.renderToolbar()
		this.renderScene()
	}

	private isSelectDoubleClick(point: AnnotationPoint, elementId: string, event: PointerEvent) {
		return (
			event.detail >= 2 ||
			(!!this.lastSelectClick &&
				this.lastSelectClick.elementId === elementId &&
				event.timeStamp - this.lastSelectClick.time <= DOUBLE_CLICK_TIMEOUT_MS &&
				distance(this.lastSelectClick.point, point) <= DOUBLE_CLICK_DISTANCE_PX)
		)
	}

	private rememberSelectClick(
		point: AnnotationPoint,
		elementId: string | null,
		event: PointerEvent
	) {
		this.lastSelectClick = { time: event.timeStamp, point, elementId }
	}

	private handlePointerMove = (event: PointerEvent) => {
		if (!this.isDrawingMode) {
			return
		}

		if (this.activePointerId !== null && this.activePointerId !== event.pointerId) {
			return
		}

		const point = pointerPoint(this.svgEl, event)
		if ((this.tool === 'select' || this.tool === 'text') && this.activePointerId === null) {
			this.updateElementHover(point)
			return
		}

		event.preventDefault()
		event.stopPropagation()

		if (this.interaction) {
			const result = applyInteraction(this.interaction, point, this.interaction.baseScene)
			if (result) {
				this.scene = result
				this.interaction.didMutate = true
			}
			this.renderScene()
			return
		}

		if (!this.draftElement) {
			return
		}

		if (this.draftElement.type === 'freedraw') {
			const points = absolutePoints(this.draftElement)
			const lastPoint = points.at(-1)
			if (!lastPoint || distance(lastPoint, point) >= 1) {
				this.draftElement = createFreeDrawElement(
					[...points, penPoint(point, event)],
					styleForElement(this.draftElement),
					this.draftElement.simulatePressure ?? true
				)
			}
		} else if (this.draftElement.type === 'line' || this.draftElement.type === 'arrow') {
			const start = absolutePoints(this.draftElement)[0] ?? {
				x: this.draftElement.x,
				y: this.draftElement.y
			}
			const end = event.shiftKey ? constrainLinearPoint(start, point) : point
			this.draftElement = createLinearElement(
				this.draftElement.type,
				start,
				end,
				styleForElement(this.draftElement)
			)
		} else if (isBoxElement(this.draftElement)) {
			const size = event.shiftKey
				? constrainBoxSize(this.draftElement.x, this.draftElement.y, point)
				: { width: point.x - this.draftElement.x, height: point.y - this.draftElement.y }
			this.draftElement = createBoxElement(
				this.draftElement.type,
				this.draftElement.x,
				this.draftElement.y,
				size.width,
				size.height,
				styleForElement(this.draftElement)
			)
		}
		this.renderScene()
	}

	private handlePointerUp = (event: PointerEvent) => {
		if (this.activePointerId !== event.pointerId) {
			return
		}

		event.preventDefault()
		event.stopPropagation()
		this.activePointerId = null
		if (this.svgEl.hasPointerCapture(event.pointerId)) {
			this.svgEl.releasePointerCapture(event.pointerId)
		}

		if (this.interaction) {
			const interaction = this.interaction
			this.interaction = null
			if (interaction.didMutate) {
				this.pushUndoState(interaction.baseScene)
				this.mutationVersion++
				this.scheduleSave()
			}
			this.renderScene()
			return
		}

		const draft = this.draftElement
		this.draftElement = null
		if (!draft) {
			return
		}

		const finalized = normalizeElementGeometry(draft)
		if (!isTrivialElement(finalized)) {
			this.commitSceneMutation({ elements: [...this.scene.elements, finalized] })
			this.selectedId = finalized.id
		}
		this.tool = 'select'
		this.renderToolbar()
		this.renderScene()
	}

	private handleToolShortcut(event: KeyboardEvent) {
		if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
			return false
		}

		const shortcutTools: Record<string, AnnotationTool> = {
			'1': 'select',
			'2': 'rectangle',
			'3': 'diamond',
			'4': 'ellipse',
			'5': 'arrow',
			'6': 'line',
			'7': 'pen',
			'8': 'text',
			'9': 'eraser'
		}

		const nextTool = shortcutTools[event.key]
		if (!nextTool) {
			return false
		}

		event.preventDefault()
		this.tool = nextTool
		this.selectedId = null
		this.draftElement = null
		this.interaction = null
		this.resetHoverState()
		this.renderToolbar()
		this.renderScene()
		return true
	}

	private handleUndoRedoShortcut(event: KeyboardEvent) {
		const key = event.key.toLowerCase()
		const isModifierPressed = event.metaKey || event.ctrlKey
		if (!isModifierPressed || event.altKey || (key !== 'z' && key !== 'y')) {
			return false
		}

		const isRedo = key === 'y' || (key === 'z' && event.shiftKey)
		event.preventDefault()
		if (isRedo) {
			this.redo()
		} else {
			this.undo()
		}
		return true
	}

	private startPointerCapture(event: PointerEvent) {
		this.svgEl.setPointerCapture(event.pointerId)
		this.activePointerId = event.pointerId
	}

	// -- Undo / redo ------------------------------------------------------

	private undo() {
		const previous = this.undoStack.pop()
		if (!previous) {
			return
		}

		this.redoStack.push(cloneScene(this.scene))
		this.scene = cloneScene(previous)
		this.mutationVersion++
		this.selectedId = this.scene.elements.some((element) => element.id === this.selectedId)
			? this.selectedId
			: null
		this.draftElement = null
		this.interaction = null
		this.renderToolbar()
		this.renderScene()
		this.scheduleSave()
	}

	private redo() {
		const next = this.redoStack.pop()
		if (!next) {
			return
		}

		this.undoStack.push(cloneScene(this.scene))
		this.scene = cloneScene(next)
		this.mutationVersion++
		this.selectedId = this.scene.elements.some((element) => element.id === this.selectedId)
			? this.selectedId
			: null
		this.draftElement = null
		this.interaction = null
		this.renderToolbar()
		this.renderScene()
		this.scheduleSave()
	}

	private commitSceneMutation(nextScene: AnnotationScene) {
		this.pushUndoState(this.scene)
		this.scene = normalizeScene(nextScene)
		this.mutationVersion++
		this.scheduleSave()
	}

	private pushUndoState(scene: AnnotationScene) {
		this.undoStack.push(cloneScene(scene))
		if (this.undoStack.length > 100) {
			this.undoStack.shift()
		}
		this.redoStack = []
	}

	private deleteSelected() {
		if (!this.selectedId) {
			return
		}
		this.commitSceneMutation({
			elements: this.scene.elements.filter((element) => element.id !== this.selectedId)
		})
		this.selectedId = null
		this.renderToolbar()
		this.renderScene()
	}

	private duplicateSelected() {
		const result = duplicateElement(this.scene, this.selectedId)
		if (!result) {
			return
		}

		this.commitSceneMutation(result.scene)
		this.selectedId = result.selectedId
		this.renderToolbar()
		this.renderScene()
	}

	private moveSelectedLayer(direction: LayerDirection) {
		const nextScene = moveElementLayer(this.scene, this.selectedId, direction)
		if (!nextScene) {
			return
		}

		this.commitSceneMutation(nextScene)
		this.renderScene()
	}

	// -- Style management -------------------------------------------------

	private styleForNewElement(): Required<AnnotationStyle> {
		return { ...this.currentStyle }
	}

	private styleForOptionsPane(): Required<AnnotationStyle> {
		const selected = this.selectedId
			? this.scene.elements.find((element) => element.id === this.selectedId)
			: null
		return selected ? styleForElement(selected) : this.currentStyle
	}

	private applyOverlayStyleUpdate(style: Partial<Required<AnnotationStyle>>) {
		const result = applyStyleUpdate(this.currentStyle, this.scene, this.selectedId, style)
		this.currentStyle = result.currentStyle
		if (result.elements) {
			this.commitSceneMutation({ elements: result.elements })
		}
	}

	private applyOverlayTextPropertyUpdate(props: {
		textAlign?: 'left' | 'center' | 'right'
		fontSize?: number
		fontFamily?: number
	}) {
		// Always track current text style for new elements
		if (props.textAlign !== undefined) this.currentTextAlign = props.textAlign
		if (props.fontSize !== undefined) this.currentFontSize = props.fontSize
		if (props.fontFamily !== undefined) this.currentFontFamily = props.fontFamily

		const result = applyTextPropertyUpdate(this.scene, this.selectedId, props)
		if (result) {
			this.commitSceneMutation({ elements: result.elements })
			if (result.updatedTextElement && result.updatedTextElement.id === this.textEditor.currentElementId) {
				this.textEditor.syncStyle(result.updatedTextElement, this.markdownFontSizePx)
			}
		}
		this.renderToolbar()
	}

	// -- Text editing -----------------------------------------------------

	private startInlineTextEditor(target: AnnotationPoint | TextAnnotationElement) {
		this.textEditor.start(
			this.rootEl,
			target,
			{
				style: this.styleForNewElement(),
				fontSize: this.currentFontSize,
				fontFamily: this.currentFontFamily,
				textAlign: this.currentTextAlign,
				markdownFontSize: this.markdownFontSizePx
			},
			this.createTextEditorHost()
		)
		this.renderScene()
	}

	private createTextEditorHost(): TextEditorHost {
		const self = this
		return {
			get isDestroyed() { return self.isDestroyed },
			getScene: () => self.scene,
			findTextElement: (id: string) =>
				self.scene.elements.find(
					(candidate): candidate is TextAnnotationElement =>
						candidate.id === id && candidate.type === 'text'
				),
			commitSceneMutation: (scene) => self.commitSceneMutation(scene),
			selectElement: (id) => {
				self.selectedId = id
			},
			switchToSelectTool: () => {
				self.tool = 'select'
				self.renderToolbar()
			},
			refresh: () => self.renderScene()
		}
	}

	// -- Cursor / hover ---------------------------------------------------

	private updateElementHover(point: AnnotationPoint) {
		const handle = this.tool === 'select' ? findSelectionHandleAtPoint(this.scene, this.selectedId, point) : null
		const hoverElement = handle
			? null
			: this.tool === 'text'
				? findTextElementAtPoint(this.scene, point)
				: findElementAtPoint(this.scene, point)
		const hoverElementId = hoverElement?.id ?? null
		if (handle === this.hoverHandle && hoverElementId === this.hoverElementId) {
			return
		}

		this.hoverHandle = handle
		this.hoverElementId = hoverElementId
		this.updateCursor()
	}

	private resetHoverState() {
		this.hoverHandle = null
		this.hoverElementId = null
		this.updateCursor()
	}

	private updateCursor() {
		this.svgEl.style.cursor = resolveCursor(
			this.tool,
			this.hoverHandle,
			this.hoverElementId,
			this.interaction?.type ?? null,
			this.eraserCursorFn,
			cursorForSelectionHandle
		)
	}

	// -- Rendering --------------------------------------------------------

	private renderScene() {
		const self = this
		renderOverlayScene(this.svgEl, this.getRenderState(), {
			app: self.plugin.app,
			view: self.view,
			component: self.plugin,
			get isDestroyed() { return self.isDestroyed },
			get selectedId() { return self.selectedId }
		})
	}

	private getRenderState(): OverlayRenderState {
		return {
			scene: this.scene,
			draftElement: this.draftElement,
			selectedId: this.selectedId,
			activeTextElementId: this.textEditor.currentElementId,
			activeTextEditor: this.textEditor.currentTextarea,
			tool: this.tool,
			hoverHandle: this.hoverHandle,
			hoverElementId: this.hoverElementId
		}
	}

	// -- Save / load ------------------------------------------------------

	private scheduleSave() {
		this.saveTimer = scheduleOverlaySave(this.saveTimer, () => void this.save())
	}

	private flushSave() {
		this.saveTimer = flushOverlaySave(this.saveTimer, () => void this.save())
	}

	private async save() {
		if (!this.file) {
			return
		}
		await saveScene(this.saveHost, this.file, this.scene, this.view, this.svgEl)
	}

	private async load() {
		const file = this.file
		const loadVersion = this.mutationVersion
		if (!file) {
			return
		}

		const scene = await loadScene(
			this.saveHost,
			file,
			loadVersion,
			() => !this.isDestroyed && this.isForFile(this.view.file) && this.mutationVersion === loadVersion,
			this.view,
			this.svgEl
		)
		if (scene) {
			this.scene = scene
			this.renderScene()
		}
	}
}

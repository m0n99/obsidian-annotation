import { App, Component, MarkdownView, TFile } from 'obsidian'
import { preloadExcalidrawFonts } from './drawing/fonts'
import {
	SELECTION_HANDLE_SIZE,
	SHIFT_LOCKING_ANGLE,
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
import { containsPoint } from './drawing/hit-test'
import {
	constrainBoxSize,
	constrainLinearPoint,
	cursorForSelectionHandle,
	distance,
	elementBounds,
	moveElement,
	resizeElementFromPointer,
	resizeEdgeAtPoint,
	rotationCenterForElement,
	selectionHandleCenter,
	selectionHandlesForElement,
	textBoxHeight,
	textBoxWidth,
	textFontFamily,
	textFontSize,
	transformHandlesForElement
} from './drawing/geometry'
import {
	absolutePoints,
	bumpElementVersion,
	createBoxElement,
	createDraftElement,
	createFreeDrawElement,
	createLinearElement
} from './drawing/excalidraw-adapter'
import { isBoxElement } from './drawing/guards'
import { normalizeTextValue } from './drawing/text'
import {
	getEditorEl,
	getEditorOverlayHost,
	getEditorOverlayMount,
	getEditorSizerCenterX,
	sizeOverlayToDocumentPlane
} from './editor-dom'
import { duplicateElement, moveElementLayer, type LayerDirection } from './overlay-scene-commands'
import { renderOverlayToolbar } from './overlay-toolbar'
import type { AnnotationData } from './persistence'
import {
	ANNOTATION_DRAWING_CLASS,
	DOUBLE_CLICK_DISTANCE_PX,
	DOUBLE_CLICK_TIMEOUT_MS,
	DEBUG_GEOMETRY_VERSION,
	SCENE_COORDINATE_SPACE,
	SCENE_SAVE_DELAY_MS,
	type InteractionState,
	isAppLevelShortcut,
	isDebugEnabled,
	isEditableKeyboardTarget,
	normalizeRadians
} from './overlay/utils'
import {
	type OverlayRenderState,
	renderOverlayScene,
	updateMarkdownTextScale
} from './overlay/rendering'
import {
	OverlayTextEditor,
	resizeTextBoxForStyleChange,
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
		this.overlayHost = getEditorOverlayHost(view)
		this.overlayMountEl = getEditorOverlayMount(view)
		this.rootEl = this.overlayMountEl.createDiv({ cls: 'annotation-editor-overlay' })
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
		this.sizeToDocumentPlane()
	}

	// -- Toolbar ----------------------------------------------------------

	private renderToolbar() {
		const selected = this.selectedId
			? this.scene.elements.find((element) => element.id === this.selectedId)
			: null
		const isTextSel = selected !== null && selected !== undefined && selected.type === 'text'

		renderOverlayToolbar(
			this.toolbarEl,
			this.stylePanelToggleEl,
			this.stylePanelEl,
			{
				tool: this.tool,
				style: this.styleForOptionsPane(),
				hasSelection: this.selectedId !== null,
				isTextSelection: isTextSel,
				textStyle:
					isTextSel && selected.type === 'text'
						? {
								style: styleForElement(selected),
								textAlign: selected.textAlign ?? 'left',
								fontSize: textFontSize(selected),
								fontFamily: selected.fontFamily ?? 1
							}
						: undefined,
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
					this.applyStyleUpdate(style)
					this.renderToolbar()
					this.renderScene()
				},
				updateOpacity: (opacity) => {
					this.applyStyleUpdate({ opacity })
					this.renderScene()
				},
				updateTextAlign: (align) => {
					this.applyTextPropertyUpdate({ textAlign: align })
					this.renderToolbar()
					this.renderScene()
				},
				updateFontSize: (size) => {
					this.applyTextPropertyUpdate({ fontSize: size })
					this.renderToolbar()
					this.renderScene()
				},
				updateFontFamily: (family) => {
					this.applyTextPropertyUpdate({ fontFamily: family })
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
						this.bringToFront()
					} else if (direction === 'forward') {
						this.bringForward()
					} else if (direction === 'backward') {
						this.sendBackward()
					} else {
						this.sendToBack()
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

	private handlePointerDown = (event: PointerEvent) => {
		if (!this.isDrawingMode || event.button !== 0) {
			return
		}

		if (this.textEditor.isActive && event.target !== this.textEditor.currentTextarea) {
			this.textEditor.commit()
		}

		event.preventDefault()
		event.stopPropagation()
		const point = this.pointerPoint(event)

		if (isDebugEnabled()) {
			this.logGeometry('pointerdown', event, point)
		}

		if (this.tool === 'select') {
			const selected = this.findElementAtPoint(point)
			this.selectedId = selected?.id ?? null
			if (selected?.type === 'text' && this.isSelectDoubleClick(point, selected.id, event)) {
				this.startInlineTextEditor(selected)
				this.renderToolbar()
				this.renderScene()
				return
			}
			this.rememberSelectClick(point, selected?.id ?? null, event)

			const handle = this.findSelectionHandleAtPoint(point)
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
			const selected = this.findTextElementAtPoint(point)
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
			const selected = this.findElementAtPoint(point)
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
			this.penPoint(point, event),
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
			this.findEventTextElement(event) ?? this.findElementAtPoint(this.pointerPoint(event))
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

	private findEventTextElement(event: MouseEvent): TextAnnotationElement | null {
		const target =
			event.target instanceof Element ? event.target.closest('[data-annotation-id]') : null
		const id = target?.getAttr('data-annotation-id')
		const element = id ? this.scene.elements.find((candidate) => candidate.id === id) : null
		return element?.type === 'text' ? element : null
	}

	private handlePointerMove = (event: PointerEvent) => {
		if (!this.isDrawingMode) {
			return
		}

		if (this.activePointerId !== null && this.activePointerId !== event.pointerId) {
			return
		}

		const point = this.pointerPoint(event)
		if ((this.tool === 'select' || this.tool === 'text') && this.activePointerId === null) {
			this.updateElementHover(point)
			return
		}

		event.preventDefault()
		event.stopPropagation()

		if (this.interaction) {
			this.applyInteraction(point)
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
					[...points, this.penPoint(point, event)],
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

	private bringForward() {
		this.moveSelectedLayer('forward')
	}

	private sendBackward() {
		this.moveSelectedLayer('backward')
	}

	private bringToFront() {
		this.moveSelectedLayer('front')
	}

	private sendToBack() {
		this.moveSelectedLayer('back')
	}

	private moveSelectedLayer(direction: LayerDirection) {
		const nextScene = moveElementLayer(this.scene, this.selectedId, direction)
		if (!nextScene) {
			return
		}

		this.commitSceneMutation(nextScene)
		this.renderScene()
	}

	private pushUndoState(scene: AnnotationScene) {
		this.undoStack.push(cloneScene(scene))
		if (this.undoStack.length > 100) {
			this.undoStack.shift()
		}
		this.redoStack = []
	}

	// -- Interaction ------------------------------------------------------

	private applyInteraction(point: AnnotationPoint) {
		const interaction = this.interaction
		if (!interaction) {
			return
		}

		const dx = point.x - interaction.startPoint.x
		const dy = point.y - interaction.startPoint.y
		if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && interaction.type !== 'rotate') {
			return
		}

		this.scene = {
			elements: interaction.baseScene.elements.map((element) => {
				if (element.id !== interaction.elementId) {
					return element
				}

				if (interaction.type === 'move') {
					return moveElement(element, dx, dy)
				}

				if (interaction.type === 'rotate') {
					return this.rotateElement(element, point, interaction)
				}

				return resizeElementFromPointer(
					element,
					interaction.handle,
					point,
					interaction.lockAspectRatio ?? false
				)
			})
		}
		interaction.didMutate = true
	}

	private rotateElement(
		element: AnnotationElement,
		point: AnnotationPoint,
		interaction: InteractionState
	): AnnotationElement {
		if (
			!interaction.rotationCenter ||
			typeof interaction.startPointerAngle !== 'number' ||
			typeof interaction.startAngle !== 'number'
		) {
			return element
		}

		const currentPointerAngle = Math.atan2(
			point.y - interaction.rotationCenter.y,
			point.x - interaction.rotationCenter.x
		)
		const angle = normalizeRadians(
			interaction.startAngle + currentPointerAngle - interaction.startPointerAngle
		)
		return bumpElementVersion({
			...element,
			angle: interaction.lockAspectRatio
				? Math.round(angle / SHIFT_LOCKING_ANGLE) * SHIFT_LOCKING_ANGLE
				: angle
		})
	}

	// -- Pointer helpers --------------------------------------------------

	private pointerPoint(event: MouseEvent): AnnotationPoint {
		const rect = this.svgEl.getBoundingClientRect()
		const width = this.svgEl.viewBox.baseVal.width || rect.width
		const height = this.svgEl.viewBox.baseVal.height || rect.height
		const point = {
			x: ((event.clientX - rect.left) * width) / rect.width,
			y: ((event.clientY - rect.top) * height) / rect.height
		}

		if (isDebugEnabled() && event.type !== 'pointermove') {
			console.debug('[annotation] pointer-point', {
				eventType: event.type,
				clientX: event.clientX,
				clientY: event.clientY,
				svgLeft: rect.left,
				svgTop: rect.top,
				svgCssWidth: rect.width,
				svgCssHeight: rect.height,
				viewBoxWidth: width,
				viewBoxHeight: height,
				pointX: point.x,
				pointY: point.y
			})
		}

		return point
	}

	private penPoint(point: AnnotationPoint, event: PointerEvent): AnnotationPoint {
		if (event.pressure === 0.5) {
			return point
		}

		return {
			...point,
			pressure: event.pressure
		}
	}

	private startPointerCapture(event: PointerEvent) {
		this.svgEl.setPointerCapture(event.pointerId)
		this.activePointerId = event.pointerId
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

	private applyStyleUpdate(style: Partial<Required<AnnotationStyle>>) {
		Object.assign(this.currentStyle, style)
		if (!this.selectedId) {
			return
		}

		let didUpdate = false
		const elements = this.scene.elements.map((element) => {
			if (element.id !== this.selectedId) {
				return element
			}

			didUpdate = true
			return this.applyStyleToElement(element, style)
		})

		if (didUpdate) {
			this.commitSceneMutation({ elements })
		}
	}

	private applyStyleToElement(
		element: AnnotationElement,
		style: Partial<Required<AnnotationStyle>>
	): AnnotationElement {
		const next: AnnotationElement = {
			...element,
			...(style.strokeColor !== undefined ? { strokeColor: style.strokeColor } : {}),
			...(style.backgroundColor !== undefined
				? { backgroundColor: style.backgroundColor }
				: {}),
			...(style.fillStyle !== undefined ? { fillStyle: style.fillStyle } : {}),
			...(style.strokeWidth !== undefined ? { strokeWidth: style.strokeWidth } : {}),
			...(style.strokeStyle !== undefined ? { strokeStyle: style.strokeStyle } : {}),
			...(style.roughness !== undefined ? { roughness: style.roughness } : {}),
			...(style.opacity !== undefined ? { opacity: style.opacity } : {}),
			...(style.edgeStyle !== undefined
				? { roundness: style.edgeStyle === 'round' ? { type: 3 } : null }
				: {})
		}

		return bumpElementVersion(next)
	}

	private applyTextPropertyUpdate(props: {
		textAlign?: 'left' | 'center' | 'right'
		fontSize?: number
		fontFamily?: number
	}) {
		if (!this.selectedId) {
			return
		}

		let didUpdate = false
		let updatedTextElement: TextAnnotationElement | undefined
		const elements = this.scene.elements.map((element) => {
			if (element.id !== this.selectedId || element.type !== 'text') {
				return element
			}

			didUpdate = true
			const next: TextAnnotationElement = { ...element }
			if (props.textAlign !== undefined) {
				next.textAlign = props.textAlign
			}
			if (props.fontSize !== undefined) {
				next.fontSize = props.fontSize
			}
			if (props.fontFamily !== undefined) {
				next.fontFamily = props.fontFamily
			}
			updatedTextElement = resizeTextBoxForStyleChange(next)
			return updatedTextElement
		})

		if (didUpdate) {
			this.commitSceneMutation({ elements })
			if (updatedTextElement && updatedTextElement.id === this.textEditor.currentElementId) {
				this.textEditor.syncStyle(updatedTextElement, this.markdownFontSizePx)
			}
		}
	}

	// -- Text editing -----------------------------------------------------

	private startInlineTextEditor(target: AnnotationPoint | TextAnnotationElement) {
		this.textEditor.start(
			this.rootEl,
			target,
			{
				style: this.styleForNewElement(),
				fontSize: this.markdownFontSizePx,
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

	// -- Hit testing ------------------------------------------------------

	private findElementAtPoint(point: AnnotationPoint): AnnotationElement | null {
		for (let index = this.scene.elements.length - 1; index >= 0; index--) {
			const candidate = this.scene.elements[index]
			if (!candidate) {
				continue
			}

			const element = normalizeElementGeometry(candidate)
			if (containsPoint(element, point)) {
				return element
			}
		}
		return null
	}

	private findTextElementAtPoint(point: AnnotationPoint): TextAnnotationElement | null {
		const element = this.findElementAtPoint(point)
		return element?.type === 'text' ? element : null
	}

	private findSelectionHandleAtPoint(point: AnnotationPoint): SelectionHandle | null {
		const selected = this.scene.elements.find((element) => element.id === this.selectedId)
		if (!selected) {
			return null
		}

		const handles = transformHandlesForElement(selected)
		for (const handle of selectionHandlesForElement(selected)) {
			const center = handles[handle] ?? selectionHandleCenter(selected, handle)
			if (
				center &&
				Math.abs(point.x - center.x) <= SELECTION_HANDLE_SIZE &&
				Math.abs(point.y - center.y) <= SELECTION_HANDLE_SIZE
			) {
				return handle
			}
		}

		return resizeEdgeAtPoint(selected, point)
	}

	// -- Cursor / hover ---------------------------------------------------

	private updateElementHover(point: AnnotationPoint) {
		const handle = this.tool === 'select' ? this.findSelectionHandleAtPoint(point) : null
		const hoverElement = handle
			? null
			: this.tool === 'text'
				? this.findTextElementAtPoint(point)
				: this.findElementAtPoint(point)
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

	private sizeToDocumentPlane() {
		sizeOverlayToDocumentPlane(
			this.view,
			this.overlayHost,
			this.overlayMountEl,
			this.rootEl,
			this.svgEl
		)
	}

	// -- Save / load ------------------------------------------------------

	private scheduleSave() {
		if (this.saveTimer !== null) {
			window.clearTimeout(this.saveTimer)
		}

		this.saveTimer = window.setTimeout(() => {
			this.saveTimer = null
			void this.save()
		}, SCENE_SAVE_DELAY_MS)
	}

	private flushSave() {
		if (this.saveTimer === null) {
			return
		}

		window.clearTimeout(this.saveTimer)
		this.saveTimer = null
		void this.save()
	}

	private async save() {
		const file = this.file
		if (!file) {
			return
		}

		const scene = this.toPersistedScene(normalizeScene(this.scene))
		const hasElements = scene.elements.length > 0
		await this.plugin.saveAnnotationData(file, {
			coordinateSpace: SCENE_COORDINATE_SPACE,
			...(hasElements ? { scene } : {})
		})
	}

	private async load() {
		const file = this.file
		const loadVersion = this.mutationVersion
		if (!file) {
			return
		}

		const data = await this.plugin.loadAnnotationData(file)
		if (
			this.isDestroyed ||
			!this.isForFile(this.view.file) ||
			this.mutationVersion !== loadVersion
		) {
			return
		}

		const sceneData =
			!data.coordinateSpace || data.coordinateSpace === SCENE_COORDINATE_SPACE
				? data.scene
				: undefined
		const scene = normalizeScene(sceneData)
		this.scene = scene.origin === 'center' ? this.fromPersistedScene(scene) : scene
		this.renderScene()
	}

	private toPersistedScene(scene: AnnotationScene): AnnotationScene {
		return scene.origin === 'center'
			? this.translateSceneX(scene, getEditorSizerCenterX(this.view, this.svgEl), 'left')
			: { ...scene, origin: 'left' }
	}

	private fromPersistedScene(scene: AnnotationScene): AnnotationScene {
		return this.translateSceneX(scene, getEditorSizerCenterX(this.view, this.svgEl), 'left')
	}

	private translateSceneX(
		scene: AnnotationScene,
		dx: number,
		origin: AnnotationScene['origin']
	): AnnotationScene {
		return {
			...scene,
			origin,
			elements: scene.elements.map((element) => ({
				...element,
				x: element.x + dx
			}))
		}
	}

	// -- Debug ------------------------------------------------------------

	private logGeometry(reason: string, event: PointerEvent, point: AnnotationPoint) {
		const svgRect = this.svgEl.getBoundingClientRect()
		const mountRect = this.overlayMountEl.getBoundingClientRect()
		const hostRect = this.overlayHost.getBoundingClientRect()

		console.debug({
			debugVersion: DEBUG_GEOMETRY_VERSION,
			reason,
			pointerX: event.clientX,
			pointerY: event.clientY,
			pointX: point.x,
			pointY: point.y,
			svgTop: svgRect.top,
			svgLeft: svgRect.left,
			svgWidth: svgRect.width,
			svgHeight: svgRect.height,
			mountTop: mountRect.top,
			mountLeft: mountRect.left,
			hostTop: hostRect.top,
			hostLeft: hostRect.left,
			hostScrollTop: this.overlayHost.scrollTop,
			hostScrollLeft: this.overlayHost.scrollLeft
		})
	}
}

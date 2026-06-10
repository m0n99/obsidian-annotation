import { MarkdownRenderer, type MarkdownView } from 'obsidian'
import {
	EXCALIDRAW_TEXT_LINE_HEIGHT,
	SELECTION_HANDLE_SIZE,
	SVG_NS,
	TEXT_MIN_BOX_WIDTH,
	type AnnotationElement,
	type AnnotationPoint,
	type AnnotationScene,
	type AnnotationStyle,
	type AnnotationTool,
	type ElementBounds,
	type SelectionHandle,
	type TextAnnotationElement
} from '../drawing/types'
import {
	elementBounds,
	paddedSelectionBounds,
	rotationCenterForElement,
	SELECTION_PADDING,
	selectionHandleCenter,
	selectionHandlesForElement,
	textBoxHeight,
	textBoxWidth,
	textFontFamily,
	textFontSize,
	transformHandlesForElement
} from '../drawing/geometry'
import { createRoughElementNode, createSvgDefs, penElementPath } from '../drawing/render'
import { normalizeElementGeometry, styleForElement } from '../drawing/scene'
import { annotationTextFontString } from '../drawing/excalidraw-adapter'
import { getEditorEl } from '../editor-dom'
import { isDebugEnabled, radiansToDegrees } from './utils'
import { getSelectedGroupIds, getElementsInGroup } from '../drawing/groups'

export type OverlayRenderState = {
	readonly scene: AnnotationScene
	readonly draftElement: AnnotationElement | null
	readonly selectedIds: ReadonlySet<string>
	readonly marqueeRect: { x: number; y: number; width: number; height: number } | null
	readonly activeTextElementId: string | null
	readonly activeTextEditor: HTMLTextAreaElement | null
	readonly tool: AnnotationTool
	readonly hoverHandle: SelectionHandle | null
	readonly hoverElementId: string | null
}

export interface OverlayRenderContext {
	readonly app: import('obsidian').App
	readonly view: MarkdownView
	readonly component: import('obsidian').Component
	isDestroyed: boolean
	selectedIds: ReadonlySet<string>
}

export function renderOverlayScene(
	svgEl: SVGSVGElement,
	state: OverlayRenderState,
	context: OverlayRenderContext
): void {
	svgEl.empty()
	svgEl.appendChild(createSvgDefs())
	svgEl.setAttr('data-annotation-tool', state.tool)
	if (!state.hoverHandle && !state.hoverElementId) {
		svgEl.style.cursor = ''
	}
	const elements = state.draftElement
		? [...state.scene.elements, state.draftElement]
		: state.scene.elements

	for (const element of elements) {
		if (element.id === state.activeTextElementId) {
			continue
		}

		const node = createAnnotationElementNode(normalizeElementGeometry(element), context)
		node.addClass('annotation-element')
		node.toggleClass('is-selected', state.selectedIds.has(element.id))
		svgEl.appendChild(node)
	}

	// Marquee rectangle (during drag-select)
	if (state.marqueeRect && state.marqueeRect.width > 0 && state.marqueeRect.height > 0) {
		const rect = document.createElementNS(SVG_NS, 'rect')
		rect.addClass('annotation-marquee')
		rect.setAttr('x', `${state.marqueeRect.x}`)
		rect.setAttr('y', `${state.marqueeRect.y}`)
		rect.setAttr('width', `${state.marqueeRect.width}`)
		rect.setAttr('height', `${state.marqueeRect.height}`)
		svgEl.appendChild(rect)
	}

	// Selection overlay
	const selectedElements = state.activeTextEditor
		? []
		: state.scene.elements.filter((element) => state.selectedIds.has(element.id))

	if (selectedElements.length === 1) {
		svgEl.appendChild(
			createAnnotationSelectionNode(normalizeElementGeometry(selectedElements[0]!))
		)
	} else if (selectedElements.length > 1) {
		svgEl.appendChild(createMultiSelectionNode(selectedElements, state.scene.elements, state.selectedIds))
	} else if (state.activeTextEditor?.dataset.annotationAutoResize === 'false') {
		svgEl.appendChild(createActiveTextEditorBox(state.activeTextEditor))
	}
}

export function createAnnotationElementNode(
	element: AnnotationElement,
	context: OverlayRenderContext
): SVGElement {
	const style = styleForElement(element)
	if (element.type === 'freedraw') {
		const path = document.createElementNS(SVG_NS, 'path')
		path.addClass('annotation-pen-element')
		path.setAttr('d', penElementPath(element))
		path.setAttr('fill', style.strokeColor)
		path.setAttr('opacity', `${style.opacity / 100}`)
		path.setAttr('data-annotation-id', element.id)
		applyElementRotation(path, element)
		return path
	}

	if (element.type === 'text') {
		const node = createMarkdownTextNode(element, style, context)
		applyElementRotation(node, element)
		return node
	}

	const node = createRoughElementNode(element, style)
	applyElementRotation(node, element)
	return node
}

function createActiveTextEditorBox(textarea: HTMLTextAreaElement): SVGElement {
	const rect = document.createElementNS(SVG_NS, 'rect')
	rect.addClass('annotation-text-editor-box')
	const x =
		Number.parseFloat(textarea.dataset.annotationSvgX ?? '') ||
		Number.parseFloat(textarea.style.left) ||
		0
	const y =
		Number.parseFloat(textarea.dataset.annotationSvgY ?? '') ||
		Number.parseFloat(textarea.style.top) ||
		0
	const width = Number.parseFloat(textarea.style.width) || textarea.offsetWidth
	const height = Number.parseFloat(textarea.style.height) || textarea.offsetHeight
	rect.setAttr('x', `${x - SELECTION_PADDING}`)
	rect.setAttr('y', `${y - SELECTION_PADDING}`)
	rect.setAttr('width', `${width + SELECTION_PADDING * 2}`)
	rect.setAttr('height', `${height + SELECTION_PADDING * 2}`)
	return rect
}

export function createAnnotationSelectionNode(element: AnnotationElement): SVGElement {
	const group = document.createElementNS(SVG_NS, 'g')
	group.addClass('annotation-selection')
	const box = paddedSelectionBounds(element)
	const center = rotationCenterForElement(element)
	const angleDegrees = radiansToDegrees(element.angle)

	if (box) {
		const rect = document.createElementNS(SVG_NS, 'rect')
		rect.addClass('annotation-selection-box')
		rect.setAttr('x', `${box.x}`)
		rect.setAttr('y', `${box.y}`)
		rect.setAttr('width', `${box.width}`)
		rect.setAttr('height', `${box.height}`)
		rect.setAttr('transform', `rotate(${angleDegrees} ${center.x} ${center.y})`)
		group.appendChild(rect)
	}

	const handles = transformHandlesForElement(element)
	for (const handle of selectionHandlesForElement(element)) {
		const handleCenter = handles[handle] ?? selectionHandleCenter(element, handle)
		if (!handleCenter) {
			continue
		}

		const rect = document.createElementNS(SVG_NS, 'rect')
		rect.addClass(
			handle === 'rotation'
				? 'annotation-selection-rotate-handle'
				: 'annotation-selection-handle'
		)
		rect.setAttr('data-annotation-handle', handle)
		rect.setAttr('x', `${handleCenter.x - SELECTION_HANDLE_SIZE / 2}`)
		rect.setAttr('y', `${handleCenter.y - SELECTION_HANDLE_SIZE / 2}`)
		rect.setAttr('width', `${SELECTION_HANDLE_SIZE}`)
		rect.setAttr('height', `${SELECTION_HANDLE_SIZE}`)
		rect.setAttr('rx', handle === 'rotation' ? `${SELECTION_HANDLE_SIZE / 2}` : '2')
		group.appendChild(rect)
	}

	return group
}

export function createMultiSelectionNode(
	selectedElements: AnnotationElement[],
	allElements: readonly AnnotationElement[],
	selectedIds: ReadonlySet<string>
): SVGElement {
	const group = document.createElementNS(SVG_NS, 'g')
	group.addClass('annotation-selection')

	const activeGroupIds = getSelectedGroupIds(selectedIds, allElements)
	const activeGroupIdSet = new Set(activeGroupIds)

	// Determine which selected elements are "selected via group" (no individual border)
	// and which are directly selected (show solid individual border).
	const elementsViaGroup = new Set<string>()
	for (const element of selectedElements) {
		for (let i = element.groupIds.length - 1; i >= 0; i--) {
			const gid = element.groupIds[i]!
			if (activeGroupIdSet.has(gid)) {
				elementsViaGroup.add(element.id)
				break
			}
		}
	}

	// 1. Individual solid borders for elements NOT selected via group
	for (const element of selectedElements) {
		if (elementsViaGroup.has(element.id)) continue
		const normalized = normalizeElementGeometry(element)
		const box = paddedSelectionBounds(normalized)
		if (!box) continue
		const rect = document.createElementNS(SVG_NS, 'rect')
		rect.addClass('annotation-selection-box')
		rect.setAttr('x', `${box.x}`)
		rect.setAttr('y', `${box.y}`)
		rect.setAttr('width', `${box.width}`)
		rect.setAttr('height', `${box.height}`)
		if (element.angle) {
			const center = rotationCenterForElement(normalized)
			rect.setAttr('transform', `rotate(${radiansToDegrees(element.angle)} ${center.x} ${center.y})`)
		}
		group.appendChild(rect)
	}

	// 2. Dashed border around each group
	for (const groupId of activeGroupIds) {
		const groupElements = getElementsInGroup(allElements, groupId)
		const groupBounds = computeBoundingBox(groupElements)
		if (!groupBounds) continue
		const padding = SELECTION_PADDING
		const rect = document.createElementNS(SVG_NS, 'rect')
		rect.addClass('annotation-selection-box-dashed')
		rect.setAttr('x', `${groupBounds.x - padding}`)
		rect.setAttr('y', `${groupBounds.y - padding}`)
		rect.setAttr('width', `${groupBounds.width + padding * 2}`)
		rect.setAttr('height', `${groupBounds.height + padding * 2}`)
		group.appendChild(rect)
	}

	// 3. Dashed bounding box around all selected elements + handles
	const totalBounds = computeBoundingBox(selectedElements)
	if (totalBounds) {
		const padding = SELECTION_PADDING
		const bx = totalBounds.x - padding
		const by = totalBounds.y - padding
		const bw = totalBounds.width + padding * 2
		const bh = totalBounds.height + padding * 2

		const boundingRect = document.createElementNS(SVG_NS, 'rect')
		boundingRect.addClass('annotation-selection-box-dashed')
		boundingRect.setAttr('x', `${bx}`)
		boundingRect.setAttr('y', `${by}`)
		boundingRect.setAttr('width', `${bw}`)
		boundingRect.setAttr('height', `${bh}`)
		group.appendChild(boundingRect)

		// Resize corners + rotate handle on bounding box (no edge handles, matching Excalidraw)
		const handles: SelectionHandle[] = ['nw', 'ne', 'se', 'sw', 'rotation']
		for (const handle of handles) {
			const center = boundingHandleCenter(bx, by, bw, bh, handle)
			if (!center) continue
			const rect = document.createElementNS(SVG_NS, 'rect')
			rect.addClass(
				handle === 'rotation'
					? 'annotation-selection-rotate-handle'
					: 'annotation-selection-handle'
			)
			rect.setAttr('data-annotation-handle', handle)
			rect.setAttr('x', `${center.x - SELECTION_HANDLE_SIZE / 2}`)
			rect.setAttr('y', `${center.y - SELECTION_HANDLE_SIZE / 2}`)
			rect.setAttr('width', `${SELECTION_HANDLE_SIZE}`)
			rect.setAttr('height', `${SELECTION_HANDLE_SIZE}`)
			rect.setAttr('rx', handle === 'rotation' ? `${SELECTION_HANDLE_SIZE / 2}` : '2')
			group.appendChild(rect)
		}
	}

	return group
}

/** Compute axis-aligned bounding box of elements. */
function computeBoundingBox(elements: readonly AnnotationElement[]): ElementBounds | null {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const element of elements) {
		const bounds = elementBounds(normalizeElementGeometry(element))
		if (!bounds) continue
		minX = Math.min(minX, bounds.x)
		minY = Math.min(minY, bounds.y)
		maxX = Math.max(maxX, bounds.x + bounds.width)
		maxY = Math.max(maxY, bounds.y + bounds.height)
	}
	if (minX >= Infinity) return null
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** Compute handle center for a bounding box (no rotation). */
function boundingHandleCenter(
	bx: number,
	by: number,
	bw: number,
	bh: number,
	handle: SelectionHandle
): AnnotationPoint | null {
	const cx = bx + bw / 2
	const cy = by + bh / 2
	// Rotation handle sits above the top edge
	if (handle === 'rotation') {
		return { x: cx, y: by - SELECTION_HANDLE_SIZE * 1.5 }
	}
	return {
		x: handle.includes('w') ? bx : handle.includes('e') ? bx + bw : cx,
		y: handle.includes('n') ? by : handle.includes('s') ? by + bh : cy
	}
}

function createMarkdownTextNode(
	element: TextAnnotationElement,
	style: Required<AnnotationStyle>,
	context: OverlayRenderContext
): SVGElement {
	const foreignObject = document.createElementNS(SVG_NS, 'foreignObject')
	foreignObject.addClass('annotation-markdown-text')
	foreignObject.setAttr('x', `${element.x}`)
	foreignObject.setAttr('y', `${element.y}`)
	foreignObject.setAttr('width', `${textBoxWidth(element)}`)
	foreignObject.setAttr('height', `${textBoxHeight(element)}`)
	foreignObject.setAttr('opacity', `${style.opacity / 100}`)
	foreignObject.setAttr('data-annotation-id', element.id)

	const container = document.createElement('div')
	container.addClass('annotation-markdown-text-content')
	container.style.color = style.strokeColor
	container.style.fontSize = `${textFontSize(element)}px`
	container.style.fontFamily = annotationTextFontString(
		textFontSize(element),
		textFontFamily(element)
	).replace(/^\d+px\s+/, '')
	container.style.lineHeight = `${EXCALIDRAW_TEXT_LINE_HEIGHT}`
	foreignObject.appendChild(container)
	void MarkdownRenderer.render(
		context.app,
		element.text,
		container,
		context.view.file?.path ?? '',
		context.component
	).then(() => {
		updateTextBoxHeightFromRenderedContent(
			element,
			container,
			context.isDestroyed,
			context.selectedIds
		)
	})
	return foreignObject
}

function applyElementRotation(node: SVGElement, element: AnnotationElement): void {
	if (!element.angle) {
		return
	}

	const center = rotationCenterForElement(element)
	node.setAttr('transform', `rotate(${radiansToDegrees(element.angle)} ${center.x} ${center.y})`)
}

function updateTextBoxHeightFromRenderedContent(
	element: TextAnnotationElement,
	container: HTMLElement,
	isDestroyed: boolean,
	selectedIds: ReadonlySet<string>
): void {
	if (isDestroyed || !container.isConnected) {
		return
	}

	const contentBounds = measureRenderedTextContent(container)
	if (contentBounds.width <= 0 || contentBounds.height <= 0) {
		return
	}
	const measuredWidth = Math.ceil(contentBounds.width)
	const measuredHeight = Math.ceil(contentBounds.height)
	const nextWidth = Math.max(TEXT_MIN_BOX_WIDTH, measuredWidth)
	const nextHeight = Math.max(textFontSize(element) * EXCALIDRAW_TEXT_LINE_HEIGHT, measuredHeight)
	if (isDebugEnabled() && selectedIds.has(element.id)) {
		console.debug('[annotation] text-measure', {
			id: element.id,
			text: element.text,
			autoResize: element.autoResize,
			storedWidth: element.width,
			storedHeight: element.height,
			contentWidth: contentBounds.width,
			contentHeight: contentBounds.height,
			scrollWidth: container.scrollWidth,
			scrollHeight: container.scrollHeight,
			nextWidth,
			nextHeight,
			selected: selectedIds.has(element.id)
		})
	}
	container.parentElement?.setAttr('width', `${nextWidth}`)
	container.parentElement?.setAttr('height', `${nextHeight}`)
}

function measureRenderedTextContent(container: HTMLElement): { width: number; height: number } {
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
	const containerRect = container.getBoundingClientRect()
	let right = 0
	let bottom = 0

	while (walker.nextNode()) {
		const node = walker.currentNode
		if (!node.textContent?.trim()) {
			continue
		}

		const range = document.createRange()
		range.selectNodeContents(node)
		for (const rect of Array.from(range.getClientRects())) {
			right = Math.max(right, rect.right - containerRect.left)
			bottom = Math.max(bottom, rect.bottom - containerRect.top)
		}
		range.detach()
	}

	return right && bottom
		? { width: right, height: bottom }
		: { width: container.scrollWidth, height: container.scrollHeight }
}

export function updateMarkdownTextScale(view: MarkdownView, defaultFontSize: number): number {
	const editorEl = getEditorEl(view)
	const markdownTextEl = editorEl?.querySelector<HTMLElement>('.cm-content, .cm-line') ?? editorEl
	const fontSize = markdownTextEl
		? Number.parseFloat(window.getComputedStyle(markdownTextEl).fontSize)
		: Number.NaN
	return Number.isFinite(fontSize) ? fontSize : defaultFontSize
}

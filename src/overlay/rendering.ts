import { MarkdownRenderer, type MarkdownView } from 'obsidian'
import {
	EXCALIDRAW_TEXT_LINE_HEIGHT,
	SELECTION_HANDLE_SIZE,
	SVG_NS,
	TEXT_MIN_BOX_WIDTH,
	type AnnotationElement,
	type AnnotationScene,
	type AnnotationStyle,
	type AnnotationTool,
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
import { isDebugEnabled, DEBUG_GEOMETRY_VERSION, radiansToDegrees } from './utils'

export type OverlayRenderState = {
	readonly scene: AnnotationScene
	readonly draftElement: AnnotationElement | null
	readonly selectedId: string | null
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
	selectedId: string | null
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
		node.toggleClass('is-selected', element.id === state.selectedId)
		svgEl.appendChild(node)
	}

	const selected = state.activeTextEditor
		? null
		: state.scene.elements.find((element) => element.id === state.selectedId)
	if (selected) {
		svgEl.appendChild(createAnnotationSelectionNode(normalizeElementGeometry(selected)))
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
	const x = Number.parseFloat(textarea.dataset.annotationSvgX ?? '') || Number.parseFloat(textarea.style.left) || 0
	const y = Number.parseFloat(textarea.dataset.annotationSvgY ?? '') || Number.parseFloat(textarea.style.top) || 0
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
			context.selectedId
		)
	})
	return foreignObject
}

function applyElementRotation(node: SVGElement, element: AnnotationElement): void {
	if (!element.angle) {
		return
	}

	const center = rotationCenterForElement(element)
	node.setAttr(
		'transform',
		`rotate(${radiansToDegrees(element.angle)} ${center.x} ${center.y})`
	)
}

function updateTextBoxHeightFromRenderedContent(
	element: TextAnnotationElement,
	container: HTMLElement,
	isDestroyed: boolean,
	selectedId: string | null
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
	const nextHeight = Math.max(
		textFontSize(element) * EXCALIDRAW_TEXT_LINE_HEIGHT,
		measuredHeight
	)
	if (isDebugEnabled() && selectedId === element.id) {
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
			selected: selectedId === element.id
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

export function updateMarkdownTextScale(
	view: MarkdownView,
	defaultFontSize: number
): number {
	const editorEl = getEditorEl(view)
	const markdownTextEl =
		editorEl?.querySelector<HTMLElement>('.cm-content, .cm-line') ?? editorEl
	const fontSize = markdownTextEl
		? Number.parseFloat(window.getComputedStyle(markdownTextEl).fontSize)
		: Number.NaN
	return Number.isFinite(fontSize) ? fontSize : defaultFontSize
}

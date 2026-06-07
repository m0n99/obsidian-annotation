import type { MarkdownView } from 'obsidian'

const DEFAULT_OVERLAY_HEIGHT = 800

export function sizeOverlayToDocumentPlane(
	view: MarkdownView,
	overlayHost: HTMLElement,
	overlayMountEl: HTMLElement,
	rootEl: HTMLElement,
	svgEl: SVGSVGElement
) {
	const editorEl = getEditorEl(view)
	const contentContainerEl = getEditorContentContainer(view)
	const hostRect = overlayHost.getBoundingClientRect()
	const editorRect = editorEl?.getBoundingClientRect() ?? hostRect

	// Static offset: contentContainer relative to scroller
	const top = contentContainerEl ? offsetTopRelativeTo(contentContainerEl, overlayHost) : 0
	const containerLeft = contentContainerEl
		? offsetLeftRelativeTo(contentContainerEl, overlayHost)
		: 0
	// Full editor width so drawings can extend beyond the content area
	const width = Math.ceil(editorRect.width || overlayHost.clientWidth)
	const height = Math.ceil(
		Math.max(overlayHost.scrollHeight, overlayHost.clientHeight, DEFAULT_OVERLAY_HEIGHT)
	)

	rootEl.style.left = '0px'
	rootEl.style.top = `${top}px`
	rootEl.style.width = `${width}px`
	rootEl.style.height = `${height}px`
	svgEl.setAttr('width', `${width}`)
	svgEl.setAttr('height', `${height}`)
	// Shift viewBox origin so SVG x=0 aligns with contentContainer left edge
	svgEl.setAttr('viewBox', `${-containerLeft} 0 ${width} ${height}`)
}

export function getEditorOverlayHost(view: MarkdownView) {
	return (
		view.contentEl.querySelector<HTMLElement>('.markdown-source-view.mod-cm6 .cm-scroller') ??
		view.contentEl
	)
}

export function getEditorOverlayMount(view: MarkdownView) {
	return getEditorSizerEl(view) ?? getEditorEl(view) ?? getEditorOverlayHost(view)
}

export function getEditorSizerEl(view: MarkdownView) {
	return view.contentEl.querySelector<HTMLElement>('.markdown-source-view.mod-cm6 .cm-sizer')
}

export function getContentContainerCenterX(view: MarkdownView, relativeTo?: Element) {
	const container = getEditorContentContainer(view)
	if (!relativeTo) {
		return (
			(container?.scrollWidth ||
				container?.clientWidth ||
				getEditorOverlayMount(view).clientWidth) / 2
		)
	}

	const referenceRect = relativeTo.getBoundingClientRect()
	const containerRect = container?.getBoundingClientRect()
	return containerRect
		? containerRect.left - referenceRect.left + containerRect.width / 2
		: referenceRect.width / 2
}

/** @deprecated Use getContentContainerCenterX */
export const getEditorSizerCenterX = getContentContainerCenterX

export function getEditorEl(view: MarkdownView) {
	return view.contentEl.querySelector<HTMLElement>('.markdown-source-view.mod-cm6 .cm-editor')
}

export function getEditorContentContainer(view: MarkdownView) {
	return view.contentEl.querySelector<HTMLElement>(
		'.markdown-source-view.mod-cm6 .cm-contentContainer'
	)
}

/** Sum offsetTop up the offsetParent chain until reaching `ancestor`. */
function offsetTopRelativeTo(el: HTMLElement, ancestor: HTMLElement): number {
	let top = 0
	let current: HTMLElement | null = el
	while (current && current !== ancestor) {
		top += current.offsetTop
		current = current.offsetParent as HTMLElement | null
	}
	return top
}

/** Sum offsetLeft up the offsetParent chain until reaching `ancestor`. */
function offsetLeftRelativeTo(el: HTMLElement, ancestor: HTMLElement): number {
	let left = 0
	let current: HTMLElement | null = el
	while (current && current !== ancestor) {
		left += current.offsetLeft
		current = current.offsetParent as HTMLElement | null
	}
	return left
}

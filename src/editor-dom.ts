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
	const editorRect = editorEl?.getBoundingClientRect() ?? overlayHost.getBoundingClientRect()
	const mountRect = overlayMountEl.getBoundingClientRect()
	const left = Math.floor(editorRect.left - mountRect.left)
	const width = Math.ceil(
		editorRect.width || overlayHost.clientWidth || overlayMountEl.clientWidth
	)
	const height = Math.ceil(
		Math.max(overlayMountEl.scrollHeight, overlayMountEl.clientHeight, DEFAULT_OVERLAY_HEIGHT)
	)

	rootEl.style.left = `${left}px`
	rootEl.style.top = '0px'
	rootEl.style.width = `${width}px`
	rootEl.style.height = `${height}px`
	svgEl.setAttr('width', `${width}`)
	svgEl.setAttr('height', `${height}`)
	svgEl.setAttr('viewBox', `0 0 ${width} ${height}`)
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

export function getEditorSizerCenterX(view: MarkdownView, relativeTo?: Element) {
	const sizer = getEditorSizerEl(view)
	if (!relativeTo) {
		return (
			(sizer?.scrollWidth || sizer?.clientWidth || getEditorOverlayMount(view).clientWidth) /
			2
		)
	}

	const referenceRect = relativeTo.getBoundingClientRect()
	const sizerRect = sizer?.getBoundingClientRect()
	return sizerRect
		? sizerRect.left - referenceRect.left + sizerRect.width / 2
		: referenceRect.width / 2
}

export function getEditorEl(view: MarkdownView) {
	return view.contentEl.querySelector<HTMLElement>('.markdown-source-view.mod-cm6 .cm-editor')
}

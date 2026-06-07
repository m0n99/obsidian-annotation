import { ERASER_CURSOR_RADIUS_PX, ERASER_CURSOR_SIZE_PX } from './utils'

export function createEraserCursor(contentEl: HTMLElement): () => string {
	let theme: 'light' | 'dark' | null = null
	let dataUrl: string | null = null

	return () => {
		const currentTheme = contentEl.matchParent('.theme-dark') ? 'dark' : 'light'
		if (!dataUrl || theme !== currentTheme) {
			const canvas = document.createElement('canvas')
			canvas.width = ERASER_CURSOR_SIZE_PX
			canvas.height = ERASER_CURSOR_SIZE_PX
			const context = canvas.getContext('2d')
			if (!context) {
				return 'auto'
			}

			context.lineWidth = 1
			context.beginPath()
			context.arc(
				ERASER_CURSOR_SIZE_PX / 2,
				ERASER_CURSOR_SIZE_PX / 2,
				ERASER_CURSOR_RADIUS_PX,
				0,
				2 * Math.PI
			)
			context.fillStyle = currentTheme === 'dark' ? '#000' : '#fff'
			context.fill()
			context.strokeStyle = currentTheme === 'dark' ? '#fff' : '#000'
			context.stroke()
			theme = currentTheme
			dataUrl = canvas.toDataURL('image/png')
		}

		const hotspot = ERASER_CURSOR_SIZE_PX / 2
		return `url(${dataUrl}) ${hotspot} ${hotspot}, auto`
	}
}

export function resolveCursor(
	tool: string,
	hoverHandle: import('../drawing/types').SelectionHandle | null,
	hoverElementId: string | null,
	interactionType: 'move' | 'resize' | 'rotate' | null,
	eraserCursor: (() => string) | null,
	cursorForHandle: (handle: import('../drawing/types').SelectionHandle) => string
): string {
	if (hoverHandle) {
		return cursorForHandle(hoverHandle)
	}
	if (tool === 'text') {
		return hoverElementId ? 'text' : 'crosshair'
	}
	if (tool === 'select' && hoverElementId) {
		return 'move'
	}
	if (tool === 'eraser' && eraserCursor) {
		return eraserCursor()
	}
	if (interactionType === 'move') {
		return 'move'
	}
	return ''
}

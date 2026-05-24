import { EXCALIDRAW_TEXT_LINE_HEIGHT } from './types'
import { getLineHeightInPx, measureText, normalizeText } from './excalidraw'

export function normalizeTextValue(value: string) {
	return normalizeText(value)
		.replace(/[ \t]+$/gm, '')
		.trim()
}

export function measureTextareaContent(textarea: HTMLTextAreaElement) {
	const computed = window.getComputedStyle(textarea)
	const font = computed.font || textarea.style.font
	const fontSize =
		Number.parseFloat(computed.fontSize || textarea.style.fontSize || textarea.style.font) || 18
	const lineHeight = parseLineHeight(textarea.style.lineHeight, fontSize)
	const value = textarea.value || 'Text'
	if (textarea.dataset.annotationAutoResize === 'false') {
		return measureWrappedText(
			value,
			font,
			lineHeight,
			textarea.clientWidth || Number.parseFloat(textarea.style.width) || 120
		)
	}

	const metrics = measureText(value, font as any, (lineHeight / fontSize) as any)
	return {
		width: Math.ceil(metrics.width),
		height: Math.ceil(metrics.height)
	}
}

function measureWrappedText(value: string, font: string, lineHeight: number, width: number) {
	const mirror = document.createElement('div')
	mirror.textContent = value
	Object.assign(mirror.style, {
		position: 'fixed',
		top: '0',
		left: '0',
		visibility: 'hidden',
		whiteSpace: 'pre-wrap',
		wordBreak: 'normal',
		overflowWrap: 'break-word',
		font,
		lineHeight: `${lineHeight}px`,
		width: `${width}px`,
		padding: '0',
		border: '0',
		margin: '0',
		boxSizing: 'content-box'
	})
	document.body.appendChild(mirror)
	const height = Math.ceil(mirror.scrollHeight)
	mirror.remove()
	return { width, height }
}

function parseLineHeight(value: string, fontSize: number) {
	if (value.endsWith('px')) {
		return Number.parseFloat(value) || getLineHeightInPx(fontSize, EXCALIDRAW_TEXT_LINE_HEIGHT)
	}

	const numeric = Number.parseFloat(value)
	return Number.isFinite(numeric)
		? numeric * fontSize
		: getLineHeightInPx(fontSize, EXCALIDRAW_TEXT_LINE_HEIGHT)
}

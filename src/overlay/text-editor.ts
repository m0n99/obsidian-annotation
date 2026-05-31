import {
	EXCALIDRAW_FONT_FAMILY,
	EXCALIDRAW_TEXT_LINE_HEIGHT,
	TEXT_MIN_BOX_WIDTH,
	type AnnotationPoint,
	type AnnotationScene,
	type AnnotationStyle,
	type TextAnnotationElement
} from '../drawing/types'
import {
	textBoxHeight,
	textBoxWidth,
	textFontFamily,
	textFontSize
} from '../drawing/geometry'
import {
	annotationTextFontString,
	bumpElementVersion,
	createTextElement,
	updateTextElement,
	wrapAnnotationText
} from '../drawing/excalidraw-adapter'
import { isTextElement } from '../drawing/guards'
import { styleForElement } from '../drawing/scene'
import {
	measureTextContent,
	measureTextareaContent,
	measureWrappedTextContent,
	normalizeTextValue
} from '../drawing/text'
import { safeRemoveElement } from './utils'

export interface TextEditorHost {
	readonly isDestroyed: boolean
	getScene(): AnnotationScene
	findTextElement(id: string): TextAnnotationElement | undefined
	commitSceneMutation(scene: AnnotationScene): void
	selectElement(id: string): void
	switchToSelectTool(): void
	refresh(): void
}

export class OverlayTextEditor {
	private textarea: HTMLTextAreaElement | null = null
	private elementId: string | null = null
	private host: TextEditorHost | null = null
	private finishFn: ((commit: boolean) => void) | null = null
	private suppressBlur = false

	get isActive(): boolean {
		return this.textarea !== null
	}

	get currentTextarea(): HTMLTextAreaElement | null {
		return this.textarea
	}

	get currentElementId(): string | null {
		return this.elementId
	}

	get isAutoResize(): boolean {
		return this.textarea?.dataset.annotationAutoResize !== 'false'
	}

	start(
		rootEl: HTMLElement,
		target: AnnotationPoint | TextAnnotationElement,
		options: {
			style: Required<AnnotationStyle>
			fontSize: number
			fontFamily?: number
			textAlign?: 'left' | 'center' | 'right'
			markdownFontSize: number
		},
		host: TextEditorHost
	): void {
		this.cancel()
		this.host = host

		const isExisting = isTextElement(target)
		this.elementId = isExisting ? target.id : null
		const point = isExisting ? { x: target.x, y: target.y } : target
		const style = isExisting ? styleForElement(target) : options.style
		const initialText = isExisting ? (target.originalText ?? target.text) : ''
		const fontSize = isExisting ? textFontSize(target) : options.fontSize
		const fontFamily = isExisting ? textFontFamily(target) : options.fontFamily
		const textAlign = isExisting ? (target.textAlign ?? 'left') : (options.textAlign ?? 'left')
		const initialWidth = isExisting ? textBoxWidth(target) : 80
		const initialHeight = isExisting
			? textBoxHeight(target)
			: fontSize * EXCALIDRAW_TEXT_LINE_HEIGHT

		const textarea = rootEl.createEl('textarea', {
			cls: 'annotation-inline-text-editor',
			attr: { spellcheck: 'false' }
		})
		textarea.style.left = `${point.x}px`
		textarea.style.top = `${point.y}px`
		textarea.style.color = style.strokeColor
		textarea.style.font = fontFamily
			? annotationTextFontString(fontSize, fontFamily)
			: `${fontSize}px ${EXCALIDRAW_FONT_FAMILY}`
		textarea.style.lineHeight = `${fontSize * EXCALIDRAW_TEXT_LINE_HEIGHT}px`
		textarea.style.width = `${initialWidth}px`
		textarea.style.height = `${initialHeight}px`
		textarea.dataset.annotationAutoResize =
			isExisting && target.autoResize === false ? 'false' : 'true'
		textarea.value = initialText
		this.textarea = textarea
		this.autosize(options.markdownFontSize)

		let isDone = false
		const finish = (commit: boolean) => {
			if (isDone) {
				return
			}
			isDone = true

			const capturedElementId = this.elementId
			const capturedHost = this.host

			if (this.finishFn === finish) {
				this.finishFn = null
			}
			if (this.textarea === textarea) {
				this.textarea = null
			}
			if (this.elementId === capturedElementId) {
				this.elementId = null
			}

			const text = normalizeTextValue(textarea.value)
			const metrics = measureTextareaContent(textarea)
			const autoResize = textarea.dataset.annotationAutoResize !== 'false'
			const width = Math.max(TEXT_MIN_BOX_WIDTH, Math.ceil(metrics.width + 2))
			const height = Math.max(
				fontSize * EXCALIDRAW_TEXT_LINE_HEIGHT,
				Math.ceil(metrics.height + 2)
			)
			safeRemoveElement(textarea)

			if (!commit || !capturedHost || capturedHost.isDestroyed) {
				return
			}

			if (isExisting) {
				const currentElement = capturedHost.findTextElement(capturedElementId ?? '')
				if (text && currentElement) {
					capturedHost.commitSceneMutation({
						elements: capturedHost.getScene().elements.map((el) =>
							el.id === currentElement.id
								? updateTextElement(
										currentElement,
										text,
										width,
										height,
										textFontSize(currentElement),
										styleForElement(currentElement),
										autoResize
									)
								: el
						)
					})
				} else if (!text && capturedElementId) {
					capturedHost.commitSceneMutation({
						elements: capturedHost.getScene().elements.filter(
							(el) => el.id !== capturedElementId
						)
					})
				}
			} else if (text) {
				const element = createTextElement(
					point.x,
					point.y,
					text,
					width,
					height,
					fontSize,
					style,
					autoResize,
					fontFamily,
					textAlign
				)
				capturedHost.commitSceneMutation({
					elements: [...capturedHost.getScene().elements, element]
				})
				capturedHost.selectElement(element.id)
				capturedHost.switchToSelectTool()
			}
			capturedHost.refresh()
		}
		this.finishFn = finish

		textarea.addEventListener('pointerdown', (event) => event.stopPropagation())
		textarea.addEventListener('input', () => {
			this.autosize(options.markdownFontSize)
			if (textarea.dataset.annotationAutoResize === 'false' && this.host) {
				this.host.refresh()
			}
		})
		textarea.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
				event.preventDefault()
				finish(true)
			} else if (event.key === 'Escape') {
				event.preventDefault()
				finish(false)
			}
		})
		textarea.addEventListener('blur', () => {
			if (this.suppressBlur) {
				this.suppressBlur = false
				textarea.focus()
				return
			}
			finish(true)
		})

		window.requestAnimationFrame(() => {
			textarea.focus()
			if (initialText) {
				textarea.setSelectionRange(initialText.length, initialText.length)
			}
		})
	}

	cancel(): void {
		this.finishFn = null
		const editor = this.textarea
		this.textarea = null
		this.elementId = null
		this.host = null
		safeRemoveElement(editor)
	}

	commit(): void {
		this.finishFn?.(true)
	}

	preventBlur(): void {
		this.suppressBlur = true
	}

	autosize(defaultFontSize: number): void {
		const textarea = this.textarea
		if (!textarea) {
			return
		}

		const metrics = measureTextareaContent(textarea)
		if (textarea.dataset.annotationAutoResize !== 'false') {
			textarea.style.width = `${Math.max(TEXT_MIN_BOX_WIDTH, Math.min(720, metrics.width + 2))}px`
		}
		const fontSize =
			Number.parseFloat(window.getComputedStyle(textarea).fontSize) || defaultFontSize
		textarea.style.height = `${Math.max(fontSize * EXCALIDRAW_TEXT_LINE_HEIGHT, metrics.height + 2)}px`
	}

	syncStyle(element: TextAnnotationElement, defaultFontSize: number): void {
		const textarea = this.textarea
		if (!textarea) {
			return
		}

		const fontSize = textFontSize(element)
		textarea.style.color = styleForElement(element).strokeColor
		textarea.style.font = annotationTextFontString(fontSize, textFontFamily(element))
		textarea.style.lineHeight = `${fontSize * EXCALIDRAW_TEXT_LINE_HEIGHT}px`
		textarea.style.width = `${textBoxWidth(element)}px`
		this.autosize(defaultFontSize)
	}
}

export function resizeTextBoxForStyleChange(
	element: TextAnnotationElement
): TextAnnotationElement {
	const text = element.originalText ?? element.text
	const fontSize = textFontSize(element)
	const fontFamily = textFontFamily(element)
	const font = annotationTextFontString(fontSize, fontFamily)
	const lineHeight = fontSize * EXCALIDRAW_TEXT_LINE_HEIGHT
	const autoResize = element.autoResize !== false
	const metrics = autoResize
		? measureTextContent(text, font, EXCALIDRAW_TEXT_LINE_HEIGHT)
		: measureWrappedTextContent(text, font, lineHeight, textBoxWidth(element))
	return bumpElementVersion({
		...element,
		text: autoResize
			? text
			: wrapAnnotationText(text, textBoxWidth(element), fontSize, fontFamily),
		originalText: text,
		width: autoResize
			? Math.max(TEXT_MIN_BOX_WIDTH, Math.ceil(metrics.width + 2))
			: textBoxWidth(element),
		height: Math.max(lineHeight, Math.ceil(metrics.height + 2)),
		autoResize
	}) as TextAnnotationElement
}

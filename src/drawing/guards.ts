import { isLinearElementType } from './excalidraw'
import type {
	AnnotationElement,
	AnnotationPoint,
	BoxAnnotationElement,
	TextAnnotationElement
} from './types'

export function isBoxElement(element: AnnotationElement): element is BoxAnnotationElement {
	return element.type === 'rectangle' || element.type === 'diamond' || element.type === 'ellipse'
}

export function isTextElement(
	value: AnnotationPoint | TextAnnotationElement
): value is TextAnnotationElement {
	return 'type' in value && value.type === 'text'
}

export function isFreeDrawElement(element: AnnotationElement) {
	return element.type === 'freedraw'
}

export function isLinearElement(
	element: AnnotationElement
): element is Extract<AnnotationElement, { type: 'line' | 'arrow' }> {
	return element.type === 'line' || element.type === 'arrow'
}

import type {
	AnnotationElement,
	AnnotationStyle,
	AnnotationScene,
	TextAnnotationElement
} from '../drawing/types'
import { bumpElementVersion } from '../drawing/excalidraw-adapter'
import { resizeTextBoxForStyleChange } from './text-editor'

export function applyStyleToElement(
	element: AnnotationElement,
	style: Partial<Required<AnnotationStyle>>
): AnnotationElement {
	const next: AnnotationElement = {
		...element,
		...(style.strokeColor !== undefined ? { strokeColor: style.strokeColor } : {}),
		...(style.backgroundColor !== undefined ? { backgroundColor: style.backgroundColor } : {}),
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

export function applyStyleUpdate(
	currentStyle: Required<AnnotationStyle>,
	scene: AnnotationScene,
	selectedIds: ReadonlySet<string>,
	style: Partial<Required<AnnotationStyle>>
): { currentStyle: Required<AnnotationStyle>; elements: AnnotationElement[] | null } {
	const nextStyle = { ...currentStyle, ...style }
	if (selectedIds.size === 0) {
		return { currentStyle: nextStyle, elements: null }
	}

	let didUpdate = false
	const elements = scene.elements.map((element) => {
		if (!selectedIds.has(element.id)) {
			return element
		}

		didUpdate = true
		return applyStyleToElement(element, style)
	})

	return {
		currentStyle: nextStyle,
		elements: didUpdate ? elements : null
	}
}

export function applyTextPropertyUpdate(
	scene: AnnotationScene,
	selectedIds: ReadonlySet<string>,
	props: {
		textAlign?: 'left' | 'center' | 'right'
		fontSize?: number
		fontFamily?: number
	}
): { elements: AnnotationElement[]; updatedTextElement: TextAnnotationElement | undefined } | null {
	if (selectedIds.size === 0) {
		return null
	}

	let didUpdate = false
	let updatedTextElement: TextAnnotationElement | undefined
	const elements = scene.elements.map((element) => {
		if (!selectedIds.has(element.id) || element.type !== 'text') {
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

	return didUpdate ? { elements, updatedTextElement } : null
}

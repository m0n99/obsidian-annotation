import { DEFAULT_ELEMENT_PROPS } from './excalidraw'
import {
	MIN_SHAPE_SIZE,
	TEXT_MIN_BOX_WIDTH,
	TEXT_MIN_FONT_SIZE,
	type AnnotationElement,
	type AnnotationPoint,
	type AnnotationStyle,
	type AnnotationScene
} from './types'
import { distance, pathLength } from './geometry'
import { absolutePoints, createElementId, normalizeElement } from './excalidraw-adapter'
import { isBoxElement } from './guards'

export function emptyScene(): AnnotationScene {
	return {
		elements: [],
		origin: 'left'
	}
}

export function normalizeScene(scene: Partial<AnnotationScene> | undefined): AnnotationScene {
	return {
		elements: Array.isArray(scene?.elements)
			? scene.elements.filter(isAnnotationElement).map(normalizeElementGeometry)
			: [],
		origin: scene?.origin === 'center' ? 'center' : 'left'
	}
}

export function isAnnotationElement(element: unknown): element is AnnotationElement {
	if (!isRecord(element) || typeof element.id !== 'string' || typeof element.type !== 'string') {
		return false
	}

	if (element.type === 'pen' || element.type === 'freedraw') {
		return Array.isArray(element.points)
	}

	if (element.type === 'rectangle' || element.type === 'diamond' || element.type === 'ellipse') {
		return (
			typeof element.x === 'number' &&
			typeof element.y === 'number' &&
			typeof element.width === 'number' &&
			typeof element.height === 'number'
		)
	}

	if (element.type === 'line' || element.type === 'arrow') {
		return Array.isArray(element.points) || (isPoint(element.start) && isPoint(element.end))
	}

	return (
		element.type === 'text' &&
		typeof element.x === 'number' &&
		typeof element.y === 'number' &&
		typeof element.text === 'string' &&
		(typeof element.width === 'undefined' || typeof element.width === 'number') &&
		(typeof element.height === 'undefined' || typeof element.height === 'number') &&
		(typeof element.fontSize === 'undefined' || typeof element.fontSize === 'number')
	)
}

export function normalizeElementGeometry(element: AnnotationElement): AnnotationElement {
	const normalized = normalizeElement(withDefaultStyle(element))

	if (normalized.type === 'text') {
		return {
			...normalized,
			width: Number.isFinite(normalized.width)
				? Math.max(TEXT_MIN_BOX_WIDTH, normalized.width)
				: TEXT_MIN_BOX_WIDTH,
			height: Number.isFinite(normalized.height)
				? Math.max(TEXT_MIN_FONT_SIZE * 1.5, normalized.height)
				: TEXT_MIN_FONT_SIZE * 1.5,
			fontSize:
				normalized.fontSize && Number.isFinite(normalized.fontSize)
					? Math.max(TEXT_MIN_FONT_SIZE, normalized.fontSize)
					: undefined
		}
	}

	if (!isBoxElement(normalized)) {
		return normalized
	}

	const x = normalized.width < 0 ? normalized.x + normalized.width : normalized.x
	const y = normalized.height < 0 ? normalized.y + normalized.height : normalized.y
	return {
		...normalized,
		x,
		y,
		width: Math.abs(normalized.width),
		height: Math.abs(normalized.height)
	}
}

export function isPoint(point: unknown): point is AnnotationPoint {
	return (
		isRecord(point) &&
		typeof point.x === 'number' &&
		typeof point.y === 'number' &&
		(typeof point.pressure === 'undefined' || typeof point.pressure === 'number')
	)
}

export function isTrivialElement(element: AnnotationElement) {
	if (element.type === 'freedraw') {
		const points = absolutePoints(element)
		return points.length < 2 || pathLength(points) < MIN_SHAPE_SIZE
	}

	if (element.type === 'line' || element.type === 'arrow') {
		const points = absolutePoints(element)
		const start = points[0]
		const end = points.at(-1)
		return !start || !end || distance(start, end) < MIN_SHAPE_SIZE
	}

	if (element.type === 'text') {
		return element.text.trim().length === 0
	}

	return (
		isBoxElement(element) && (element.width < MIN_SHAPE_SIZE || element.height < MIN_SHAPE_SIZE)
	)
}

export function defaultAnnotationStyle(): Required<AnnotationStyle> {
	return {
		strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
		backgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
		fillStyle: 'hachure',
		strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
		strokeStyle: 'solid',
		roughness: DEFAULT_ELEMENT_PROPS.roughness,
		edgeStyle: 'sharp',
		opacity: DEFAULT_ELEMENT_PROPS.opacity
	}
}

export function styleForElement(element: AnnotationElement): Required<AnnotationStyle> {
	return {
		...defaultAnnotationStyle(),
		strokeColor: element.strokeColor ?? DEFAULT_ELEMENT_PROPS.strokeColor,
		backgroundColor: element.backgroundColor ?? DEFAULT_ELEMENT_PROPS.backgroundColor,
		fillStyle: element.fillStyle ?? 'hachure',
		strokeWidth: element.strokeWidth ?? DEFAULT_ELEMENT_PROPS.strokeWidth,
		strokeStyle: element.strokeStyle ?? 'solid',
		roughness: element.roughness ?? DEFAULT_ELEMENT_PROPS.roughness,
		edgeStyle: element.roundness ? 'round' : 'sharp',
		opacity: element.opacity ?? DEFAULT_ELEMENT_PROPS.opacity
	}
}

export function withDefaultStyle<T extends AnnotationElement>(element: T): T {
	return {
		...element,
		...styleForElement(element)
	}
}

export function cloneScene(scene: AnnotationScene): AnnotationScene {
	return {
		elements: scene.elements.map((element) => ({
			...element,
			...(element.type === 'freedraw' || element.type === 'line' || element.type === 'arrow'
				? { points: element.points.map((point) => [...point] as [number, number]) }
				: {}),
			...(element.type === 'freedraw' ? { pressures: [...element.pressures] } : {})
		}))
	}
}

export { createElementId }

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

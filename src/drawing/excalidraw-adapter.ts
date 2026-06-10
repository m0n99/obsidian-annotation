import {
	TEXT_DEFAULT_FONT_SIZE,
	TEXT_MARKDOWN_DEFAULT_FONT_SIZE,
	type AnnotationElement,
	type AnnotationPoint,
	type AnnotationStyle,
	type AnnotationTool,
	type FreeDrawAnnotationElement,
	type LinearAnnotationElement,
	type TextAnnotationElement
} from './types'
import {
	DEFAULT_ELEMENT_PROPS,
	FONT_FAMILY,
	getFontString,
	getLineHeight,
	hashString,
	newArrowElement,
	newElement,
	newFreeDrawElement,
	newLinearElement,
	newTextElement,
	wrapText
} from './excalidraw'

const DEFAULT_ANNOTATION_FONT_FAMILY = FONT_FAMILY.Nunito

export function createElementId() {
	return `ln_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function bumpElementVersion<T extends AnnotationElement>(element: T): T {
	return {
		...element,
		version: element.version + 1,
		versionNonce: randomVersionNonce(),
		updated: Date.now()
	}
}

export function createDraftElement(
	tool: Exclude<AnnotationTool, 'select' | 'hand' | 'eraser' | 'text' | 'image'>,
	point: AnnotationPoint,
	style: Required<AnnotationStyle>,
	event?: PointerEvent
): AnnotationElement {
	if (tool === 'pen') {
		return createFreeDrawElement([point], style, event?.pressure === 0.5)
	}

	if (tool === 'line') {
		return createLinearElement('line', point, point, style)
	}

	if (tool === 'arrow') {
		return createLinearElement('arrow', point, point, style)
	}

	return createBoxElement(tool, point.x, point.y, 0, 0, style)
}

export function createBoxElement(
	type: 'rectangle' | 'diamond' | 'ellipse',
	x: number,
	y: number,
	width: number,
	height: number,
	style: Required<AnnotationStyle>
): AnnotationElement {
	return normalizeElement(
		newElement({
			id: createElementId(),
			type,
			x,
			y,
			width,
			height,
			...styleToExcalidraw(style)
		} as any)
	)
}

export function createLinearElement(
	type: 'line' | 'arrow',
	start: AnnotationPoint,
	end: AnnotationPoint,
	style: Required<AnnotationStyle>
): LinearAnnotationElement {
	const width = end.x - start.x
	const height = end.y - start.y
	const factory = type === 'arrow' ? newArrowElement : newLinearElement
	return normalizeElement(
		factory({
			id: createElementId(),
			type,
			x: start.x,
			y: start.y,
			width,
			height,
			points: [
				[0, 0],
				[width, height]
			],
			startArrowhead: null,
			endArrowhead: type === 'arrow' ? 'arrow' : null,
			polygon: false,
			...styleToExcalidraw(style)
		} as any)
	) as LinearAnnotationElement
}

export function createFreeDrawElement(
	points: AnnotationPoint[],
	style: Required<AnnotationStyle>,
	simulatePressure = true
): FreeDrawAnnotationElement {
	const absolutePoints = points.filter(isFinitePoint)
	if (!absolutePoints.length) {
		absolutePoints.push({ x: 0, y: 0 })
	}
	const minX = Math.min(...absolutePoints.map((point) => point.x))
	const minY = Math.min(...absolutePoints.map((point) => point.y))
	const maxX = Math.max(...absolutePoints.map((point) => point.x))
	const maxY = Math.max(...absolutePoints.map((point) => point.y))
	return normalizeElement(
		newFreeDrawElement({
			id: createElementId(),
			type: 'freedraw',
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY,
			points: absolutePoints.map((point) => [point.x - minX, point.y - minY]),
			pressures: absolutePoints.map((point) => point.pressure ?? 0.5),
			simulatePressure,
			...styleToExcalidraw(style)
		} as any)
	) as FreeDrawAnnotationElement
}

export function createTextElement(
	x: number,
	y: number,
	text: string,
	width: number,
	height: number,
	fontSize: number,
	style: Required<AnnotationStyle>,
	autoResize = true,
	fontFamily = DEFAULT_ANNOTATION_FONT_FAMILY,
	textAlign: 'left' | 'center' | 'right' = 'left'
): TextAnnotationElement {
	const displayText = autoResize ? text : wrapAnnotationText(text, width, fontSize, fontFamily)
	return normalizeElement(
		newTextElement({
			id: createElementId(),
			type: 'text',
			x,
			y,
			width,
			height,
			text: displayText,
			originalText: text,
			fontSize,
			fontFamily,
			textAlign,
			verticalAlign: 'top',
			containerId: null,
			autoResize,
			lineHeight: getLineHeight(fontFamily),
			...styleToExcalidraw(style)
		} as any)
	) as TextAnnotationElement
}

export function updateTextElement(
	element: TextAnnotationElement,
	text: string,
	width: number,
	height: number,
	fontSize: number,
	style: Required<AnnotationStyle>,
	autoResize = element.autoResize !== false
): TextAnnotationElement {
	const fontFamily = element.fontFamily ?? DEFAULT_ANNOTATION_FONT_FAMILY
	const displayText = autoResize ? text : wrapAnnotationText(text, width, fontSize, fontFamily)
	return normalizeElement({
		...element,
		text: displayText,
		originalText: text,
		width,
		height,
		fontSize,
		autoResize,
		...styleToExcalidraw(style)
	}) as TextAnnotationElement
}

export function wrapAnnotationText(
	text: string,
	width: number,
	fontSize: number,
	fontFamily = DEFAULT_ANNOTATION_FONT_FAMILY
) {
	return wrapText(text, annotationTextFontString(fontSize, fontFamily), width)
}

export function annotationTextFontString(
	fontSize: number,
	fontFamily = DEFAULT_ANNOTATION_FONT_FAMILY
) {
	return getFontString({ fontSize, fontFamily: normalizeAnnotationFontFamily(fontFamily) })
}

export function normalizeAnnotationFontFamily(fontFamily: number) {
	return fontFamily === FONT_FAMILY.Virgil ? DEFAULT_ANNOTATION_FONT_FAMILY : fontFamily
}

export function normalizeElement(element: Record<string, unknown>): AnnotationElement {
	const base = {
		angle: 0,
		strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
		backgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
		fillStyle: 'hachure' as const,
		strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
		strokeStyle: 'solid' as const,
		roundness: null,
		roughness: DEFAULT_ELEMENT_PROPS.roughness,
		opacity: DEFAULT_ELEMENT_PROPS.opacity,
		seed: Math.abs(hashString(String(element.id ?? createElementId()))) || 1,
		version: 1,
		versionNonce: randomVersionNonce(),
		index: null,
		isDeleted: false,
		frameId: null,
		boundElements: null,
		updated: Date.now(),
		link: null,
		locked: false,
		customData: {},
		...element,
		groupIds: Array.isArray(element.groupIds) ? element.groupIds : []
	} as Record<string, unknown>

	if (base.type === 'freedraw' || base.type === 'pen') {
		const x = numberValue(base.x)
		const y = numberValue(base.y)
		const points = normalizeLocalPoints(base.points, x, y, base.type === 'pen')
		const width = numberValue(
			base.width,
			points.length ? Math.max(...points.map((point) => point[0])) : 0
		)
		const height = numberValue(
			base.height,
			points.length ? Math.max(...points.map((point) => point[1])) : 0
		)
		return {
			...base,
			type: 'freedraw',
			x,
			y,
			width,
			height,
			points,
			pressures: normalizePressures(base.pressures, points.length, base.points),
			simulatePressure:
				typeof base.simulatePressure === 'boolean' ? base.simulatePressure : true
		} as FreeDrawAnnotationElement
	}

	if (base.type === 'line' || base.type === 'arrow') {
		const points = normalizeLinearPoints(base)
		return {
			...base,
			points,
			width: numberValue(base.width, points.at(-1)?.[0] ?? 0),
			height: numberValue(base.height, points.at(-1)?.[1] ?? 0),
			startBinding: null,
			endBinding: null,
			startArrowhead: null,
			endArrowhead: base.type === 'arrow' ? 'arrow' : null,
			...(base.type === 'line'
				? { polygon: Boolean(base.polygon) }
				: { elbowed: Boolean(base.elbowed) })
		} as LinearAnnotationElement
	}

	if (base.type === 'text') {
		const text = String(base.text ?? '')
		return {
			...base,
			text,
			originalText: String(base.originalText ?? text),
			fontSize:
				base.fontSize === undefined
					? TEXT_DEFAULT_FONT_SIZE
					: numberValue(base.fontSize, TEXT_MARKDOWN_DEFAULT_FONT_SIZE),
			fontFamily: normalizeAnnotationFontFamily(
				numberValue(base.fontFamily, DEFAULT_ANNOTATION_FONT_FAMILY)
			),
			textAlign:
				base.textAlign === 'center' || base.textAlign === 'right' ? base.textAlign : 'left',
			verticalAlign: base.verticalAlign === 'middle' ? 'middle' : 'top',
			containerId: typeof base.containerId === 'string' ? base.containerId : null,
			autoResize: base.autoResize !== false,
			lineHeight: numberValue(base.lineHeight, getLineHeight(DEFAULT_ANNOTATION_FONT_FAMILY))
		} as TextAnnotationElement
	}

	return base as AnnotationElement
}

export function absolutePoints(
	element: FreeDrawAnnotationElement | LinearAnnotationElement
): AnnotationPoint[] {
	const originX = numberValue(element.x)
	const originY = numberValue(element.y)
	return element.points
		.map((point, index) => ({
			x: originX + numberValue(point[0]),
			y: originY + numberValue(point[1]),
			...(element.type === 'freedraw'
				? { pressure: numberValue(element.pressures[index], 0.5) }
				: {})
		}))
		.filter(isFinitePoint)
}

export function toElementsMap(elements: readonly AnnotationElement[]) {
	return new Map(
		elements.map((element) => [element.id, element as unknown as Record<string, unknown>])
	)
}

function styleToExcalidraw(style: Required<AnnotationStyle>) {
	return {
		strokeColor: style.strokeColor,
		backgroundColor: style.backgroundColor,
		fillStyle: style.fillStyle,
		strokeWidth: style.strokeWidth,
		strokeStyle: style.strokeStyle,
		roughness: style.roughness,
		opacity: style.opacity,
		roundness: style.edgeStyle === 'round' ? { type: 3 } : null
	}
}

function normalizeLocalPoints(
	value: unknown,
	x: number,
	y: number,
	absolute = false
): Array<[number, number]> {
	if (!Array.isArray(value)) {
		return []
	}

	return value.map((point) => {
		if (Array.isArray(point)) {
			return [numberValue(point[0]), numberValue(point[1])] as [number, number]
		}
		if (isPointRecord(point)) {
			return [point.x - (absolute ? x : 0), point.y - (absolute ? y : 0)] as [number, number]
		}
		return [0, 0] as [number, number]
	})
}

function normalizeLinearPoints(element: Record<string, unknown>): Array<[number, number]> {
	if (Array.isArray(element.points)) {
		return normalizeLocalPoints(element.points, numberValue(element.x), numberValue(element.y))
	}

	const start = isPointRecord(element.start)
		? element.start
		: { x: numberValue(element.x), y: numberValue(element.y) }
	const end = isPointRecord(element.end)
		? element.end
		: { x: start.x + numberValue(element.width), y: start.y + numberValue(element.height) }
	element.x = start.x
	element.y = start.y
	return [
		[0, 0],
		[end.x - start.x, end.y - start.y]
	]
}

function normalizePressures(value: unknown, length: number, originalPoints: unknown) {
	if (Array.isArray(value)) {
		return value.map((pressure) => numberValue(pressure, 0.5))
	}

	if (Array.isArray(originalPoints)) {
		return originalPoints.map((point) =>
			isPointRecord(point) ? numberValue(point.pressure, 0.5) : 0.5
		)
	}

	return Array.from({ length }, () => 0.5)
}

function isPointRecord(value: unknown): value is AnnotationPoint {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as AnnotationPoint).x === 'number' &&
		typeof (value as AnnotationPoint).y === 'number'
	)
}

function isFinitePoint(point: AnnotationPoint) {
	return Number.isFinite(point.x) && Number.isFinite(point.y)
}

function numberValue(value: unknown, fallback = 0) {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function randomVersionNonce() {
	return Math.floor(Math.random() * 2 ** 31)
}

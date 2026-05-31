import {
	EXCALIDRAW_TEXT_LINE_HEIGHT,
	EXCALIDRAW_FONT_FAMILY_ID,
	MIN_SHAPE_SIZE,
	SELECTION_HANDLE_SIZE,
	TEXT_DEFAULT_FONT_SIZE,
	TEXT_MIN_BOX_WIDTH,
	TEXT_MIN_FONT_SIZE,
	type AnnotationElement,
	type AnnotationPoint,
	type BoxAnnotationElement,
	type ElementBounds,
	type SelectionHandle,
	type TextAnnotationElement
} from './types'
import {
	absolutePoints,
	annotationTextFontString,
	bumpElementVersion,
	normalizeElement,
	toElementsMap,
	wrapAnnotationText
} from './excalidraw-adapter'
import { isBoxElement } from './guards'
import {
	getElementAbsoluteCoords,
	getElementBounds,
	getTransformHandles,
	getTransformHandlesFromCoords,
	getCursorForResizingElement,
	measureText,
	ANNOTATION_ZOOM,
	resizeSingleElement
} from './excalidraw'
import { AnnotationSceneAdapter } from './scene-adapter'

export const SELECTION_PADDING = 4

type TransformDirection = Exclude<SelectionHandle, 'rotation' | 'start' | 'end'>

export function moveElement(element: AnnotationElement, dx: number, dy: number): AnnotationElement {
	return normalizeElement(
		bumpElementVersion({ ...element, x: element.x + dx, y: element.y + dy })
	)
}

export function resizeElementFromPointer(
	element: AnnotationElement,
	handle: SelectionHandle | undefined,
	pointer: AnnotationPoint,
	lockAspectRatio = false,
	resizeFromCenter = false
): AnnotationElement {
	if (!handle) {
		return element
	}

	if (element.type === 'line' || element.type === 'arrow') {
		const points = element.points.map((point) => [...point] as [number, number])
		if (handle === 'start') {
			points[0] = [pointer.x - element.x, pointer.y - element.y]
		}
		if (handle === 'end') {
			const lastIndex = Math.max(points.length - 1, 0)
			points[lastIndex] = [pointer.x - element.x, pointer.y - element.y]
		}
		return normalizeElement(bumpElementVersion({ ...element, points }))
	}

	if (!isTransformDirection(handle)) {
		return element
	}

	// Use Excalidraw's resizeSingleElement for all box and text elements.
	// This gives us Excalidraw-exact position computation for rotated resize,
	// and proper text container height recalculation.
	if (!isBoxElement(element) && element.type !== 'text') {
		return element
	}

	const { nextWidth, nextHeight } = nextSingleSizeFromPointer(
		element as BoxAnnotationElement,
		handle,
		pointer,
		lockAspectRatio,
		resizeFromCenter
	)
	const mutableCopy = { ...element } as any
	const originalMap = toElementsMap([element]) as any
	const adapter = new AnnotationSceneAdapter([element])
	resizeSingleElement(
		Math.abs(nextWidth),
		Math.abs(nextHeight),
		mutableCopy,
		element as any,
		originalMap,
		adapter as any,
		handle,
		{ shouldMaintainAspectRatio: lockAspectRatio, shouldResizeFromCenter: resizeFromCenter }
	)

	if (element.type === 'text') {
		return resizeTextElementFromMutable(element, mutableCopy, handle)
	}

	return normalizeBoxGeometry(
		bumpElementVersion({
			...element,
			x: mutableCopy.x,
			y: mutableCopy.y,
			width: Math.max(MIN_SHAPE_SIZE, mutableCopy.width),
			height: Math.max(MIN_SHAPE_SIZE, mutableCopy.height)
		})
	)
}

export function paddedSelectionBounds(element: AnnotationElement): ElementBounds | null {
	const bounds = elementBounds(element)
	if (!bounds) {
		return null
	}

	// Fixed 4px padding matching Excalidraw's DEFAULT_TRANSFORM_HANDLE_SPACING * 2
	// and the internal margin used by getTransformHandles.
	const padding = SELECTION_PADDING
	return {
		x: bounds.x - padding,
		y: bounds.y - padding,
		width: bounds.width + padding * 2,
		height: bounds.height + padding * 2
	}
}

export function normalizeBoxGeometry<T extends BoxAnnotationElement>(element: T): T {
	const x = element.width < 0 ? element.x + element.width : element.x
	const y = element.height < 0 ? element.y + element.height : element.y
	return {
		...element,
		x,
		y,
		width: Math.abs(element.width),
		height: Math.abs(element.height)
	}
}

export function elementBounds(element: AnnotationElement): ElementBounds | null {
	if (element.type === 'text') {
		return {
			x: element.x,
			y: element.y,
			width: textBoxWidth(element),
			height: textBoxHeight(element)
		}
	}
	const [x1, y1, x2, y2] = getElementBounds(element as any, toElementsMap([element]) as any, true)
	return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

export function selectionHandlesForElement(element: AnnotationElement): SelectionHandle[] {
	if (element.type === 'freedraw') {
		return ['nw', 'ne', 'se', 'sw', 'rotation']
	}

	if (element.type === 'text') {
		return ['nw', 'ne', 'se', 'sw', 'rotation']
	}

	if (isBoxElement(element)) {
		return ['nw', 'ne', 'se', 'sw', 'rotation']
	}

	if (element.type === 'line' || element.type === 'arrow') {
		return ['start', 'end']
	}

	return []
}

export function selectionHandleCenter(
	element: AnnotationElement,
	handle: SelectionHandle
): AnnotationPoint | null {
	if (element.type === 'line' || element.type === 'arrow') {
		if (handle === 'start') {
			return absolutePoints(element)[0] ?? null
		}
		if (handle === 'end') {
			return absolutePoints(element).at(-1) ?? null
		}
		return null
	}

	const bounds = elementBounds(element)
	if (!bounds) {
		return null
	}

	return transformHandleCenterFromBounds(bounds, element.angle, handle)
}

export function transformHandlesForElement(
	element: AnnotationElement
): Partial<Record<SelectionHandle, AnnotationPoint | undefined>> {
	if (element.type === 'line' || element.type === 'arrow') {
		const points = absolutePoints(element)
		return {
			start: pointHandle(points[0]),
			end: pointHandle(points.at(-1))
		} satisfies Partial<Record<SelectionHandle, AnnotationPoint | undefined>>
	}

	if (element.type === 'text') {
		const bounds = paddedSelectionBounds(element)
		if (!bounds) {
			return {}
		}

		const handles = getTransformHandlesFromCoords(
			boundsToCoords(bounds),
			element.angle as Parameters<typeof getTransformHandlesFromCoords>[1],
			ANNOTATION_ZOOM,
			'mouse',
			omitHandlesForElement(element),
			0
		)
		return Object.fromEntries(
			Object.entries(handles)
				.filter(([handle]) =>
					selectionHandlesForElement(element).includes(handle as SelectionHandle)
				)
				.map(([handle, bounds]) => [
					handle,
					boundsToCenter(bounds as [number, number, number, number])
				])
		) as Partial<Record<SelectionHandle, AnnotationPoint | undefined>>
	}

	// Pass the original element — getTransformHandles applies its own
	// internal margin (4px) which matches the selection border offset.
	const handles = getTransformHandles(
		element as any,
		ANNOTATION_ZOOM,
		toElementsMap([element]) as any,
		'mouse',
		omitHandlesForElement(element)
	)
	return Object.fromEntries(
		Object.entries(handles)
			.filter(([handle]) =>
				selectionHandlesForElement(element).includes(handle as SelectionHandle)
			)
			.map(([handle, bounds]) => [
				handle,
				boundsToCenter(bounds as [number, number, number, number])
			])
	) as Partial<Record<SelectionHandle, AnnotationPoint | undefined>>
}

export function rotationCenterForElement(element: AnnotationElement): AnnotationPoint {
	if (element.type === 'text') {
		const bounds = elementBounds(element)
		if (bounds) {
			return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
		}
	}

	const coords = getElementAbsoluteCoords(element as any, toElementsMap([element]) as any, true)
	return { x: coords[4], y: coords[5] }
}

export function cursorForSelectionHandle(handle: SelectionHandle) {
	if (handle === 'start' || handle === 'end') return 'move'
	return getCursorForResizingElement({ transformHandleType: handle })
}

/** Hit tolerance for detecting pointer on selection border edges. */
const BORDER_HIT_TOLERANCE = 4

/**
 * Detect which selection border edge the pointer is near.
 * Returns 'n', 's', 'w', 'e' if the pointer is within BORDER_HIT_TOLERANCE
 * of that edge of the padded selection bounds, or null if not near any edge.
 * Only returns edges that are valid resize directions for the element type.
 */
export function resizeEdgeAtPoint(
	element: AnnotationElement,
	point: AnnotationPoint
): SelectionHandle | null {
	if (element.type === 'line' || element.type === 'arrow') {
		return null
	}

	const box = paddedSelectionBounds(element)
	if (!box) {
		return null
	}

	// Rotate pointer into element's local coordinate space
	const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
	const local = rotateVectorAround(point, center, -element.angle)

	const t = BORDER_HIT_TOLERANCE
	const nearLeft = Math.abs(local.x - box.x) <= t
	const nearRight = Math.abs(local.x - (box.x + box.width)) <= t
	const nearTop = Math.abs(local.y - box.y) <= t
	const nearBottom = Math.abs(local.y - (box.y + box.height)) <= t
	const insideX = local.x >= box.x - t && local.x <= box.x + box.width + t
	const insideY = local.y >= box.y - t && local.y <= box.y + box.height + t

	// Check edges (not corners - corners are handled by corner handles)
	if (nearTop && insideX && !nearLeft && !nearRight) return 'n'
	if (nearBottom && insideX && !nearLeft && !nearRight) return 's'
	if (nearLeft && insideY && !nearTop && !nearBottom) return 'w'
	if (nearRight && insideY && !nearTop && !nearBottom) return 'e'

	return null
}

export function textFontSize(element: TextAnnotationElement) {
	return element.fontSize ?? TEXT_DEFAULT_FONT_SIZE
}

export function textFontFamily(element: TextAnnotationElement) {
	return element.fontFamily ?? EXCALIDRAW_FONT_FAMILY_ID
}

export function textBoxWidth(element: TextAnnotationElement) {
	return Math.max(
		TEXT_MIN_BOX_WIDTH,
		Math.ceil(element.width || measureTextElement(element).width)
	)
}

export function textBoxHeight(element: TextAnnotationElement) {
	return Math.max(
		TEXT_MIN_FONT_SIZE * 1.5,
		Math.ceil(element.height || measureTextElement(element).height)
	)
}

function resizeTextElementFromMutable(
	element: TextAnnotationElement,
	mutated: TextAnnotationElement,
	handle: TransformDirection
): TextAnnotationElement {
	const nextWidth = Math.max(TEXT_MIN_BOX_WIDTH, mutated.width)
	const nextHeight = Math.max(TEXT_MIN_FONT_SIZE * 1.5, mutated.height)
	if (handle === 'e' || handle === 'w') {
		const fontSize = textFontSize(element)
		const fontFamily = textFontFamily(element)
		const originalText = element.originalText ?? element.text
		return bumpElementVersion({
			...element,
			x: mutated.x,
			y: mutated.y,
			width: nextWidth,
			height: nextHeight,
			fontSize,
			fontFamily,
			text: wrapAnnotationText(originalText, nextWidth, fontSize, fontFamily),
			originalText,
			autoResize: false
		})
	}

	const fontSize = Math.max(TEXT_MIN_FONT_SIZE, mutated.fontSize ?? textFontSize(element))
	return bumpElementVersion({
		...element,
		x: mutated.x,
		y: mutated.y,
		width: nextWidth,
		height: nextHeight,
		fontSize,
		text: element.originalText ?? element.text,
		originalText: element.originalText ?? element.text,
		autoResize: true
	})
}

function measureTextElement(element: TextAnnotationElement) {
	const fontSize = textFontSize(element)
	return measureText(
		element.text || 'Text',
		annotationTextFontString(fontSize, textFontFamily(element)),
		EXCALIDRAW_TEXT_LINE_HEIGHT as any
	)
}

function omitHandlesForElement(_element: AnnotationElement): Record<string, boolean> {
	// Match Excalidraw DEFAULT_OMIT_SIDES: side handles are not shown visually.
	// Side resize still works via resizeTest on the selection border.
	return { n: true, s: true, w: true, e: true }
}

function boundsToCenter(bounds: [number, number, number, number]): AnnotationPoint {
	return { x: bounds[0] + bounds[2] / 2, y: bounds[1] + bounds[3] / 2 }
}

function boundsToCoords(bounds: ElementBounds): [number, number, number, number, number, number] {
	const x2 = bounds.x + bounds.width
	const y2 = bounds.y + bounds.height
	return [bounds.x, bounds.y, x2, y2, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2]
}

function pointHandle(point: AnnotationPoint | undefined) {
	return point ? { x: point.x, y: point.y } : undefined
}

function transformHandleCenterFromBounds(
	bounds: ElementBounds,
	angle: number,
	handle: SelectionHandle
): AnnotationPoint {
	const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
	const point = {
		x: handle.includes('w')
			? bounds.x
			: handle.includes('e')
				? bounds.x + bounds.width
				: center.x,
		y: handle.includes('n')
			? bounds.y
			: handle.includes('s')
				? bounds.y + bounds.height
				: center.y
	}
	return rotateVectorAround(point, center, angle)
}

function rotateVector(x: number, y: number, angle: number): AnnotationPoint {
	return {
		x: x * Math.cos(angle) - y * Math.sin(angle),
		y: x * Math.sin(angle) + y * Math.cos(angle)
	}
}

function rotateVectorAround(
	point: AnnotationPoint,
	center: AnnotationPoint,
	angle: number
): AnnotationPoint {
	const rotated = rotateVector(point.x - center.x, point.y - center.y, angle)
	return { x: center.x + rotated.x, y: center.y + rotated.y }
}

function isTransformDirection(handle: SelectionHandle): handle is TransformDirection {
	return (
		handle === 'n' ||
		handle === 's' ||
		handle === 'w' ||
		handle === 'e' ||
		handle === 'nw' ||
		handle === 'ne' ||
		handle === 'sw' ||
		handle === 'se'
	)
}

function nextSingleSizeFromPointer(
	element: BoxAnnotationElement,
	handle: TransformDirection,
	pointer: AnnotationPoint,
	lockAspectRatio: boolean,
	resizeFromCenter: boolean
) {
	const startTopLeft = { x: element.x, y: element.y }
	const startBottomRight = { x: element.x + element.width, y: element.y + element.height }
	const startCenter = { x: element.x + element.width / 2, y: element.y + element.height / 2 }
	const rotatedPointer = rotateVectorAround(pointer, startCenter, -element.angle)
	let scaleX = 1
	let scaleY = 1

	if (handle.includes('e')) {
		scaleX = (rotatedPointer.x - startTopLeft.x) / element.width
	}
	if (handle.includes('s')) {
		scaleY = (rotatedPointer.y - startTopLeft.y) / element.height
	}
	if (handle.includes('w')) {
		scaleX = (startBottomRight.x - rotatedPointer.x) / element.width
	}
	if (handle.includes('n')) {
		scaleY = (startBottomRight.y - rotatedPointer.y) / element.height
	}

	let nextWidth = element.width * scaleX
	let nextHeight = element.height * scaleY
	if (resizeFromCenter) {
		nextWidth = 2 * nextWidth - element.width
		nextHeight = 2 * nextHeight - element.height
	}

	if (lockAspectRatio) {
		const widthRatio = Math.abs(nextWidth) / Math.max(element.width, 1)
		const heightRatio = Math.abs(nextHeight) / Math.max(element.height, 1)
		if (handle.length === 1) {
			nextHeight *= widthRatio
			nextWidth *= heightRatio
		} else {
			const ratio = Math.max(widthRatio, heightRatio)
			nextWidth = element.width * ratio * Math.sign(nextWidth || 1)
			nextHeight = element.height * ratio * Math.sign(nextHeight || 1)
		}
	}

	return { nextWidth, nextHeight }
}

export function constrainLinearPoint(
	start: AnnotationPoint,
	point: AnnotationPoint
): AnnotationPoint {
	const dx = point.x - start.x
	const dy = point.y - start.y
	const distanceFromStart = Math.hypot(dx, dy)
	if (distanceFromStart === 0) {
		return point
	}

	const snappedAngle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
	return {
		x: start.x + Math.cos(snappedAngle) * distanceFromStart,
		y: start.y + Math.sin(snappedAngle) * distanceFromStart
	}
}

export function constrainBoxSize(originX: number, originY: number, point: AnnotationPoint) {
	const width = point.x - originX
	const height = point.y - originY
	const size = Math.max(Math.abs(width), Math.abs(height))
	return {
		width: Math.sign(width || 1) * size,
		height: Math.sign(height || 1) * size
	}
}

export function pathLength(points: AnnotationPoint[]) {
	return points.reduce((total, point, index) => {
		const previous = points[index - 1]
		return previous ? total + distance(previous, point) : total
	}, 0)
}

export function distance(a: AnnotationPoint, b: AnnotationPoint) {
	return Math.hypot(a.x - b.x, a.y - b.y)
}

export function distanceToSegment(
	point: AnnotationPoint,
	start: AnnotationPoint,
	end: AnnotationPoint
) {
	const dx = end.x - start.x
	const dy = end.y - start.y
	const lengthSquared = dx * dx + dy * dy
	if (lengthSquared === 0) {
		return distance(point, start)
	}

	const t = Math.max(
		0,
		Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)
	)
	return distance(point, { x: start.x + t * dx, y: start.y + t * dy })
}

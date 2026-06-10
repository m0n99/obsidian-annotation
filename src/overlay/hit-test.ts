import {
	SELECTION_HANDLE_SIZE,
	type AnnotationElement,
	type AnnotationPoint,
	type AnnotationScene,
	type SelectionHandle,
	type TextAnnotationElement
} from '../drawing/types'
import { containsPoint } from '../drawing/hit-test'
import {
	elementBounds,
	resizeEdgeAtPoint,
	selectionHandleCenter,
	selectionHandlesForElement,
	transformHandlesForElement,
	SELECTION_PADDING
} from '../drawing/geometry'
import { normalizeElementGeometry } from '../drawing/scene'

export function findElementAtPoint(
	scene: AnnotationScene,
	point: AnnotationPoint
): AnnotationElement | null {
	for (let index = scene.elements.length - 1; index >= 0; index--) {
		const candidate = scene.elements[index]
		if (!candidate) {
			continue
		}

		const element = normalizeElementGeometry(candidate)
		if (containsPoint(element, point)) {
			return element
		}
	}
	return null
}

export function findTextElementAtPoint(
	scene: AnnotationScene,
	point: AnnotationPoint
): TextAnnotationElement | null {
	const element = findElementAtPoint(scene, point)
	return element?.type === 'text' ? element : null
}

export function findSelectionHandleAtPoint(
	scene: AnnotationScene,
	selectedId: string | null,
	point: AnnotationPoint
): SelectionHandle | null {
	const selected = scene.elements.find((element) => element.id === selectedId)
	if (!selected) {
		return null
	}

	const handles = transformHandlesForElement(selected)
	for (const handle of selectionHandlesForElement(selected)) {
		const center = handles[handle] ?? selectionHandleCenter(selected, handle)
		if (
			center &&
			Math.abs(point.x - center.x) <= SELECTION_HANDLE_SIZE &&
			Math.abs(point.y - center.y) <= SELECTION_HANDLE_SIZE
		) {
			return handle
		}
	}

	return resizeEdgeAtPoint(selected, point)
}

/** Hit-test handles on the multi-select bounding box (no rotation). */
export function findMultiSelectionHandleAtPoint(
	selectedElements: readonly AnnotationElement[],
	point: AnnotationPoint
): SelectionHandle | null {
	if (selectedElements.length < 2) return null

	const bounds = computeBounds(selectedElements)
	if (!bounds) return null

	const padding = SELECTION_PADDING
	const bx = bounds.x - padding
	const by = bounds.y - padding
	const bw = bounds.width + padding * 2
	const bh = bounds.height + padding * 2
	const cx = bx + bw / 2
	const cy = by + bh / 2

	// Corner + rotation only (no edge handles), matching Excalidraw multi-select
	const handles: SelectionHandle[] = ['nw', 'ne', 'se', 'sw', 'rotation']
	for (const handle of handles) {
		let hx: number
		let hy: number
		if (handle === 'rotation') {
			hx = cx
			hy = by - SELECTION_HANDLE_SIZE * 1.5
		} else {
			hx = handle.includes('w') ? bx : handle.includes('e') ? bx + bw : cx
			hy = handle.includes('n') ? by : handle.includes('s') ? by + bh : cy
		}
		if (
			Math.abs(point.x - hx) <= SELECTION_HANDLE_SIZE &&
			Math.abs(point.y - hy) <= SELECTION_HANDLE_SIZE
		) {
			return handle
		}
	}

	return null
}

function computeBounds(elements: readonly AnnotationElement[]): { x: number; y: number; width: number; height: number } | null {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const element of elements) {
		const bounds = elementBounds(normalizeElementGeometry(element))
		if (!bounds) continue
		minX = Math.min(minX, bounds.x)
		minY = Math.min(minY, bounds.y)
		maxX = Math.max(maxX, bounds.x + bounds.width)
		maxY = Math.max(maxY, bounds.y + bounds.height)
	}
	if (minX >= Infinity) return null
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function findEventTextElement(
	scene: AnnotationScene,
	event: MouseEvent
): TextAnnotationElement | null {
	const target =
		event.target instanceof Element ? event.target.closest('[data-annotation-id]') : null
	const id = target?.getAttr('data-annotation-id')
	const element = id ? scene.elements.find((candidate) => candidate.id === id) : null
	return element?.type === 'text' ? element : null
}

export function marqueeToRect(
	start: AnnotationPoint,
	end: AnnotationPoint
): { x: number; y: number; width: number; height: number } {
	return {
		x: Math.min(start.x, end.x),
		y: Math.min(start.y, end.y),
		width: Math.abs(end.x - start.x),
		height: Math.abs(end.y - start.y)
	}
}

export function findElementsInRect(
	scene: AnnotationScene,
	rect: { x: number; y: number; width: number; height: number }
): AnnotationElement[] {
	const x2 = rect.x + rect.width
	const y2 = rect.y + rect.height

	return scene.elements.filter((element) => {
		const bounds = elementBounds(normalizeElementGeometry(element))
		if (!bounds) return false
		return (
			bounds.x >= rect.x &&
			bounds.y >= rect.y &&
			bounds.x + bounds.width <= x2 &&
			bounds.y + bounds.height <= y2
		)
	})
}

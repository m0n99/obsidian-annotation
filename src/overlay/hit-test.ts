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
	resizeEdgeAtPoint,
	selectionHandleCenter,
	selectionHandlesForElement,
	transformHandlesForElement
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

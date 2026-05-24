import type { AnnotationElement, AnnotationScene } from './drawing/types'
import { createElementId } from './drawing/scene'

export type LayerDirection = 'front' | 'forward' | 'backward' | 'back'

export function canMoveElementLayer(
	scene: AnnotationScene,
	selectedId: string | null,
	direction: LayerDirection
) {
	const idx = scene.elements.findIndex((element) => element.id === selectedId)
	if (idx < 0) {
		return false
	}

	return direction === 'front' || direction === 'forward'
		? idx < scene.elements.length - 1
		: idx > 0
}

export function duplicateElement(scene: AnnotationScene, selectedId: string | null) {
	const element = scene.elements.find((candidate) => candidate.id === selectedId)
	if (!element) {
		return null
	}

	const newId = createElementId()
	const clone: AnnotationElement = {
		...element,
		id: newId,
		x: element.x + 20,
		y: element.y + 20
	}
	return {
		scene: { elements: [...scene.elements, clone] },
		selectedId: newId
	}
}

export function moveElementLayer(
	scene: AnnotationScene,
	selectedId: string | null,
	direction: LayerDirection
): AnnotationScene | null {
	const idx = scene.elements.findIndex((element) => element.id === selectedId)
	if (idx < 0) {
		return null
	}

	if (direction === 'forward') {
		return swapElements(scene, idx, idx + 1)
	}
	if (direction === 'backward') {
		return swapElements(scene, idx, idx - 1)
	}
	if (direction === 'front') {
		return moveElementToIndex(scene, idx, scene.elements.length - 1)
	}
	return moveElementToIndex(scene, idx, 0)
}

function swapElements(scene: AnnotationScene, from: number, to: number): AnnotationScene | null {
	if (to < 0 || to >= scene.elements.length) {
		return null
	}

	const elements = [...scene.elements]
	const temp = elements[to]!
	elements[to] = elements[from]!
	elements[from] = temp
	return { elements }
}

function moveElementToIndex(
	scene: AnnotationScene,
	from: number,
	to: number
): AnnotationScene | null {
	if (from === to || to < 0 || to >= scene.elements.length) {
		return null
	}

	const elements = [...scene.elements]
	const [element] = elements.splice(from, 1)
	elements.splice(to, 0, element!)
	return { elements }
}

import type { AnnotationElement, AnnotationScene } from '../drawing/types'
import { createElementId } from '../drawing/scene'

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

export function duplicateElement(scene: AnnotationScene, selectedIds: ReadonlySet<string>) {
	if (selectedIds.size === 0) {
		return null
	}

	const newIds: string[] = []
	const clones: AnnotationElement[] = []
	for (const id of selectedIds) {
		const element = scene.elements.find((candidate) => candidate.id === id)
		if (!element) continue
		const newId = createElementId()
		newIds.push(newId)
		clones.push({ ...element, id: newId, x: element.x + 20, y: element.y + 20 })
	}
	if (clones.length === 0) return null

	return {
		scene: { elements: [...scene.elements, ...clones] },
		selectedIds: new Set(newIds)
	}
}

export function moveElementLayer(
	scene: AnnotationScene,
	selectedIds: ReadonlySet<string>,
	direction: LayerDirection
): AnnotationScene | null {
	// Layer operations work on a single element; use first selected
	const primaryId = selectedIds.size > 0 ? [...selectedIds][0] : null
	if (!primaryId) return null

	const idx = scene.elements.findIndex((element) => element.id === primaryId)
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

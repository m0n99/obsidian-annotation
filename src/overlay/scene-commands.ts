import type { AnnotationElement, AnnotationScene } from '../drawing/types'
import { createElementId } from '../drawing/scene'
import {
	allElementsInSameGroup,
	groupSelectedElements,
	ungroupSelectedElements,
	getSelectedGroupIds as getActiveGroupIds
} from '../drawing/groups'
import { alignElements, type Alignment } from '../drawing/align'

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

// -- Group / Ungroup --------------------------------------------------------

export function canGroupSelected(
	scene: AnnotationScene,
	selectedIds: ReadonlySet<string>
): boolean {
	return selectedIds.size >= 2 && !allElementsInSameGroup(selectedIds, scene.elements)
}

export function groupElements(
	scene: AnnotationScene,
	selectedIds: ReadonlySet<string>
): { scene: AnnotationScene; selectedIds: Set<string> } | null {
	if (!canGroupSelected(scene, selectedIds)) return null

	const newGroupId = createElementId()
	const elements = groupSelectedElements(scene.elements, selectedIds, newGroupId)
	return {
		scene: { elements },
		selectedIds: new Set(selectedIds)
	}
}

export function canUngroupSelected(
	scene: AnnotationScene,
	selectedIds: ReadonlySet<string>
): boolean {
	if (selectedIds.size === 0) return false
	return getActiveGroupIds(selectedIds, scene.elements).length > 0
}

export function ungroupElements(
	scene: AnnotationScene,
	selectedIds: ReadonlySet<string>
): { scene: AnnotationScene; selectedIds: Set<string> } | null {
	if (!canUngroupSelected(scene, selectedIds)) return null

	const elements = ungroupSelectedElements(scene.elements, selectedIds)
	// After ungrouping, keep the same elements selected
	return {
		scene: { elements },
		selectedIds: new Set(selectedIds)
	}
}

// -- Align -------------------------------------------------------------------

export function canAlignSelected(
	scene: AnnotationScene,
	selectedIds: ReadonlySet<string>
): boolean {
	if (selectedIds.size < 2) return false
	// Need at least 2 logical units (groups or individual elements)
	const selectedElements = scene.elements.filter((e) => selectedIds.has(e.id))
	const activeGroupIds = getActiveGroupIds(selectedIds, scene.elements)
	const groupedCount = activeGroupIds.reduce((count, gid) => {
		return count + scene.elements.filter((e) => e.groupIds.includes(gid)).length
	}, 0)
	const ungroupedCount = selectedElements.length - groupedCount
	const logicalUnits = activeGroupIds.length + ungroupedCount
	return logicalUnits >= 2
}

export function alignSelectedElements(
	scene: AnnotationScene,
	selectedIds: ReadonlySet<string>,
	alignment: Alignment
): AnnotationScene | null {
	const elements = alignElements(scene.elements, selectedIds, alignment)
	if (!elements) return null
	return { elements }
}

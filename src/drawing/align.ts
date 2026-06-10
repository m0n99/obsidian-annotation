import type { AnnotationElement } from './types'
import { getCommonBoundingBox } from './excalidraw'
import type { Alignment } from '@excalidraw/element'
import type { ExcalidrawElement } from '@excalidraw/element/types'
import { getSelectedGroupIds } from './groups'

export type { Alignment }

// AnnotationElement has optional style fields while ExcalidrawElement requires them.
// After normalization they're always present, so casting is safe for bounding box computations.
type AsExcalidraw = ExcalidrawElement

/** Calculate the translation for a group of elements to align within a bounding box.
 *  Uses the same algorithm as Excalidraw's calculateTranslation. */
function calculateTranslation(
	groupElements: readonly AnnotationElement[],
	selectionBB: { minX: number; minY: number; maxX: number; maxY: number },
	alignment: Alignment
): { x: number; y: number } {
	const groupBB = getCommonBoundingBox(groupElements as AsExcalidraw[])

	const [min, max]: ['minX' | 'minY', 'maxX' | 'maxY'] =
		alignment.axis === 'x' ? ['minX', 'maxX'] : ['minY', 'maxY']

	const noTranslation = { x: 0, y: 0 }

	if (alignment.position === 'start') {
		return { ...noTranslation, [alignment.axis]: selectionBB[min] - groupBB[min] }
	}
	if (alignment.position === 'end') {
		return { ...noTranslation, [alignment.axis]: selectionBB[max] - groupBB[max] }
	}
	// center
	return {
		...noTranslation,
		[alignment.axis]:
			(selectionBB[min] + selectionBB[max]) / 2 - (groupBB[min] + groupBB[max]) / 2
	}
}

/** Get selected elements grouped by their group, or as individual elements if ungrouped.
 *  Returns an array of groups (each group is an array of elements). */
function getSelectedElementsByGroup(
	selectedElements: readonly AnnotationElement[],
	allElements: readonly AnnotationElement[],
	selectedIds: ReadonlySet<string>
): AnnotationElement[][] {
	const selectedGroupIds = getSelectedGroupIds(selectedIds, allElements)

	const groupMap = new Map<string, AnnotationElement[]>()
	const ungrouped: AnnotationElement[] = []

	for (const element of selectedElements) {
		if (element.groupIds.length > 0) {
			let matched = false
			for (let i = element.groupIds.length - 1; i >= 0; i--) {
				const gid = element.groupIds[i]!
				if (selectedGroupIds.includes(gid)) {
					const existing = groupMap.get(gid) ?? []
					existing.push(element)
					groupMap.set(gid, existing)
					matched = true
					break
				}
			}
			if (!matched) {
				ungrouped.push(element)
			}
		} else {
			ungrouped.push(element)
		}
	}

	const groups: AnnotationElement[][] = [...groupMap.values()]

	// If there's only one group and all elements are in it, split by nested subgroups
	if (groups.length === 1 && ungrouped.length === 0 && selectedElements.length > 2) {
		const group = groups[0]!
		const nestedMap = new Map<string, AnnotationElement[]>()

		for (const element of group) {
			if (element.groupIds.length >= 2) {
				const subGroupId = element.groupIds[element.groupIds.length - 2]!
				const existing = nestedMap.get(subGroupId) ?? []
				existing.push(element)
				nestedMap.set(subGroupId, existing)
			} else {
				const key = `__single_${element.id}`
				nestedMap.set(key, [element])
			}
		}

		if (nestedMap.size > 1) {
			return [...nestedMap.values()]
		}
	}

	for (const element of ungrouped) {
		groups.push([element])
	}

	return groups.length > 0 ? groups : selectedElements.map((e) => [e])
}

/** Align selected elements according to the given alignment.
 *  Returns updated elements array, or null if nothing to align.
 *  Uses Excalidraw's getCommonBoundingBox for bounding box computation. */
export function alignElements(
	elements: readonly AnnotationElement[],
	selectedIds: ReadonlySet<string>,
	alignment: Alignment
): AnnotationElement[] | null {
	if (selectedIds.size < 2) return null

	const selectedElements = elements.filter((e) => selectedIds.has(e.id))
	if (selectedElements.length < 2) return null

	const selectionBB = getCommonBoundingBox(selectedElements as AsExcalidraw[])
	const groups = getSelectedElementsByGroup(selectedElements, elements, selectedIds)

	if (groups.length < 2) return null

	const updatedMap = new Map<string, AnnotationElement>()

	for (const group of groups) {
		const translation = calculateTranslation(group, selectionBB, alignment)
		for (const element of group) {
			updatedMap.set(element.id, {
				...element,
				x: element.x + translation.x,
				y: element.y + translation.y
			})
		}
	}

	return elements.map((element) => updatedMap.get(element.id) ?? element)
}

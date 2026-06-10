import type { AnnotationElement } from './types'
import {
	isElementInGroup as _isElementInGroup,
	elementsAreInSameGroup as _elementsAreInSameGroup,
	addToGroup as _addToGroup,
	removeFromSelectedGroups as _removeFromSelectedGroups
} from '@excalidraw/element'
import type { ExcalidrawElement } from '@excalidraw/element/types'

// AnnotationElement has optional style fields (e.g. strokeColor?: string)
// while ExcalidrawElement requires them. After normalization they're always present,
// so casting is safe for read-only group operations.
type AsExcalidraw = ExcalidrawElement

/** Check if an element belongs to a given group. Wraps @excalidraw/element. */
export function isElementInGroup(element: AnnotationElement, groupId: string): boolean {
	return _isElementInGroup(element as AsExcalidraw, groupId)
}

/** Check whether all elements share a common group. Wraps @excalidraw/element. */
export function elementsAreInSameGroup(elements: AnnotationElement[]): boolean {
	return _elementsAreInSameGroup(elements as AsExcalidraw[])
}

/** Get all elements that belong to a given group. */
export function getElementsInGroup(
	elements: readonly AnnotationElement[],
	groupId: string
): AnnotationElement[] {
	return elements.filter((element) => isElementInGroup(element, groupId))
}

/** Wrap Excalidraw's addToGroup — simplified (no editingGroupId for nested editing). */
export function addToGroup(
	prevGroupIds: readonly string[],
	newGroupId: string
): string[] {
	return _addToGroup(prevGroupIds, newGroupId, null)
}

/** Wrap Excalidraw's removeFromSelectedGroups — converts Set to Record for API compat. */
export function removeFromSelectedGroups(
	groupIds: readonly string[],
	selectedGroupIds: ReadonlySet<string>
): string[] {
	const record: Record<string, boolean> = {}
	for (const id of selectedGroupIds) {
		record[id] = true
	}
	return _removeFromSelectedGroups(groupIds, record)
}

/** Get the active group IDs from selected elements (the shallowest group of each element). */
export function getSelectedGroupIds(
	selectedIds: ReadonlySet<string>,
	elements: readonly AnnotationElement[]
): string[] {
	const groupIds = new Set<string>()
	for (const element of elements) {
		if (selectedIds.has(element.id) && element.groupIds.length > 0) {
			groupIds.add(element.groupIds[element.groupIds.length - 1]!)
		}
	}
	return [...groupIds]
}

/** Given a clicked element, expand selection to include all elements in the same group(s). */
export function expandSelectionToGroup(
	clickedElement: AnnotationElement,
	currentSelectedIds: ReadonlySet<string>,
	allElements: readonly AnnotationElement[]
): Set<string> {
	const result = new Set(currentSelectedIds)
	result.add(clickedElement.id)

	for (const groupId of clickedElement.groupIds) {
		for (const element of getElementsInGroup(allElements, groupId)) {
			result.add(element.id)
		}
	}

	return result
}

/** Check whether all selected elements are already in the same group. */
export function allElementsInSameGroup(
	selectedIds: ReadonlySet<string>,
	elements: readonly AnnotationElement[]
): boolean {
	if (selectedIds.size < 2) return false
	const selectedElements = elements.filter((e) => selectedIds.has(e.id))
	if (selectedElements.length < 2) return false
	return elementsAreInSameGroup(selectedElements)
}

/** Group the selected elements together under a new groupId. */
export function groupSelectedElements(
	elements: readonly AnnotationElement[],
	selectedIds: ReadonlySet<string>,
	newGroupId: string
): AnnotationElement[] {
	return elements.map((element) => {
		if (!selectedIds.has(element.id)) return element
		return {
			...element,
			groupIds: addToGroup(element.groupIds, newGroupId)
		}
	})
}

/** Ungroup the selected elements by removing the shallowest group IDs. */
export function ungroupSelectedElements(
	elements: readonly AnnotationElement[],
	selectedIds: ReadonlySet<string>
): AnnotationElement[] {
	const groupIdsToRemove = new Set<string>()
	for (const element of elements) {
		if (selectedIds.has(element.id) && element.groupIds.length > 0) {
			groupIdsToRemove.add(element.groupIds[element.groupIds.length - 1]!)
		}
	}

	return elements.map((element) => {
		if (!selectedIds.has(element.id)) return element
		return {
			...element,
			groupIds: removeFromSelectedGroups(element.groupIds, groupIdsToRemove)
		}
	})
}

/** Reduce a property across selected elements to a common value, or undefined if they differ. */
export function reduceToCommonValue<T>(
	elements: readonly AnnotationElement[],
	selectedIds: ReadonlySet<string>,
	getter: (element: AnnotationElement) => T | undefined
): T | undefined {
	let commonValue: T | undefined
	let first = true

	for (const element of elements) {
		if (!selectedIds.has(element.id)) continue
		const value = getter(element)
		if (first) {
			commonValue = value
			first = false
		} else if (value !== commonValue) {
			return undefined
		}
	}
	return commonValue
}

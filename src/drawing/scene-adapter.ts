/**
 * Minimal Scene adapter for Excalidraw's resizeSingleElement.
 *
 * Excalidraw's resize/transform functions expect a Scene object that
 * implements mutateElement, getNonDeletedElementsMap, and triggerUpdate.
 * This adapter wraps Annotation's element array to provide that interface.
 *
 * Usage:
 *   const adapter = new AnnotationSceneAdapter(elements);
 *   resizeSingleElement(nextWidth, nextHeight, latest, orig, origMap, adapter, handle, opts);
 *   // adapter.mutatedElements contains the updated elements
 */

export class AnnotationSceneAdapter {
	private elementsMap: Map<string, any>
	private mutated = new Set<string>()

	constructor(elements: readonly any[]) {
		this.elementsMap = new Map(elements.map((el) => [el.id, el]))
	}

	/** Called by Excalidraw resize to apply element updates in-place. */
	mutateElement(
		element: Record<string, unknown>,
		updates: Record<string, unknown>,
		_options?: { informMutation?: boolean; isDragging?: boolean }
	): void {
		this.mutated.add(element.id as string)
		Object.assign(element, updates)
		// Bump version like Excalidraw does
		if ('version' in element) {
			element.version = ((element.version as number) ?? 0) + 1
		}
		if ('versionNonce' in element) {
			element.versionNonce = Math.floor(Math.random() * 2 ** 31)
		}
		if ('updated' in element) {
			element.updated = Date.now()
		}
	}

	/** Returns the current elements map. */
	getNonDeletedElementsMap(): Map<string, any> {
		return this.elementsMap
	}

	/** No-op: Annotation handles re-rendering separately. */
	triggerUpdate(): void {
		// intentionally empty
	}

	/** Get element by ID. */
	getElement(id: string): any | null {
		return this.elementsMap.get(id) ?? null
	}

	/** Whether an element was mutated during this adapter's lifetime. */
	wasMutated(id: string): boolean {
		return this.mutated.has(id)
	}

	/** Reset mutation tracking (call before a new resize operation). */
	resetMutationTracking(): void {
		this.mutated.clear()
	}
}

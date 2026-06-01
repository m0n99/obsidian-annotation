import type { AnnotationPoint, AnnotationScene, SelectionHandle } from '../drawing/types'

export const ANNOTATION_DRAWING_CLASS = 'annotation-drawing-mode'
export const SCENE_SAVE_DELAY_MS = 500
export const SCENE_COORDINATE_SPACE = 'annotation-document-svg-v1'
export const DEBUG_STORAGE_KEY = 'annotation-debug'
export const DEBUG_GEOMETRY_VERSION = 'document-svg-v1'
export const ERASER_CURSOR_SIZE_PX = 20
export const ERASER_CURSOR_RADIUS_PX = 5
export const DOUBLE_CLICK_TIMEOUT_MS = 500
export const DOUBLE_CLICK_DISTANCE_PX = 12

export type InteractionState = {
	type: 'move' | 'resize' | 'rotate'
	elementId: string
	selectedIds?: Set<string>
	startPoint: AnnotationPoint
	baseScene: AnnotationScene
	handle?: SelectionHandle
	didMutate: boolean
	lockAspectRatio?: boolean
	startBounds?: { x: number; y: number; width: number; height: number }
	rotationCenter?: AnnotationPoint
	startAngle?: number
	startPointerAngle?: number
}

export function radiansToDegrees(value: number): number {
	return (value * 180) / Math.PI
}

export function normalizeRadians(value: number): number {
	const fullTurn = Math.PI * 2
	return ((value % fullTurn) + fullTurn) % fullTurn
}

export function safeRemoveElement(element: HTMLElement | null): void {
	if (!element?.parentNode) {
		return
	}

	try {
		element.parentNode.removeChild(element)
	} catch (error) {
		if (!(error instanceof DOMException) || error.name !== 'NotFoundError') {
			throw error
		}
	}
}

export function isDebugEnabled(): boolean {
	return window.localStorage.getItem(DEBUG_STORAGE_KEY) === 'true'
}

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable ||
			!!target.closest('input, textarea, select, [contenteditable="true"]'))
	)
}

export function isAppLevelShortcut(event: KeyboardEvent): boolean {
	return event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'q'
}

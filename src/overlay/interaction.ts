import type { AnnotationElement, AnnotationPoint } from '../drawing/types'
import type { InteractionState } from './utils'
import { SHIFT_LOCKING_ANGLE } from '../drawing/types'
import { moveElement, resizeElementFromPointer } from '../drawing/geometry'
import { bumpElementVersion } from '../drawing/excalidraw-adapter'
import { normalizeRadians } from './utils'

export function applyInteraction(
	interaction: InteractionState,
	point: AnnotationPoint,
	baseScene: import('../drawing/types').AnnotationScene
): import('../drawing/types').AnnotationScene | null {
	const dx = point.x - interaction.startPoint.x
	const dy = point.y - interaction.startPoint.y
	if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && interaction.type !== 'rotate') {
		return null
	}

	return {
		elements: baseScene.elements.map((element) => {
			if (element.id !== interaction.elementId) {
				return element
			}

			if (interaction.type === 'move') {
				return moveElement(element, dx, dy)
			}

			if (interaction.type === 'rotate') {
				return rotateElement(element, point, interaction)
			}

			return resizeElementFromPointer(
				element,
				interaction.handle,
				point,
				interaction.lockAspectRatio ?? false
			)
		})
	}
}

export function rotateElement(
	element: AnnotationElement,
	point: AnnotationPoint,
	interaction: InteractionState
): AnnotationElement {
	if (
		!interaction.rotationCenter ||
		typeof interaction.startPointerAngle !== 'number' ||
		typeof interaction.startAngle !== 'number'
	) {
		return element
	}

	const currentPointerAngle = Math.atan2(
		point.y - interaction.rotationCenter.y,
		point.x - interaction.rotationCenter.x
	)
	const angle = normalizeRadians(
		interaction.startAngle + currentPointerAngle - interaction.startPointerAngle
	)
	return bumpElementVersion({
		...element,
		angle: interaction.lockAspectRatio
			? Math.round(angle / SHIFT_LOCKING_ANGLE) * SHIFT_LOCKING_ANGLE
			: angle
	})
}

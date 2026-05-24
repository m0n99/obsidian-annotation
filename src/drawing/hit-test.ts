import type { AnnotationElement, AnnotationPoint } from './types'
import { distanceToSegment, elementBounds } from './geometry'
import { absolutePoints, toElementsMap } from './excalidraw-adapter'
import { hitElementItself, type GlobalPoint } from './excalidraw'

export function containsPoint(element: AnnotationElement, point: AnnotationPoint) {
	const preciseHit = hitElementItself({
		point: [point.x, point.y] as GlobalPoint,
		element: element as any,
		threshold: 8,
		elementsMap: toElementsMap([element]) as any,
		overrideShouldTestInside: false
	})

	if (preciseHit) {
		return true
	}

	if (element.type === 'freedraw') {
		return absolutePoints(element).some((candidate, index, points) => {
			const next = points[index + 1]
			return next ? distanceToSegment(point, candidate, next) <= 8 : false
		})
	}

	if (element.type === 'line' || element.type === 'arrow') {
		const points = absolutePoints(element)
		return points.some((candidate, index) => {
			const next = points[index + 1]
			return next ? distanceToSegment(point, candidate, next) <= 8 : false
		})
	}

	const bounds = elementBounds(element)
	return (
		!!bounds &&
		point.x >= bounds.x &&
		point.x <= bounds.x + bounds.width &&
		point.y >= bounds.y &&
		point.y <= bounds.y + bounds.height
	)
}

import type { AnnotationPoint } from '../drawing/types'
import { DEBUG_GEOMETRY_VERSION, isDebugEnabled } from './utils'

export function pointerPoint(svgEl: SVGSVGElement, event: MouseEvent): AnnotationPoint {
	const rect = svgEl.getBoundingClientRect()
	const width = svgEl.viewBox.baseVal.width || rect.width
	const height = svgEl.viewBox.baseVal.height || rect.height
	const point = {
		x: ((event.clientX - rect.left) * width) / rect.width,
		y: ((event.clientY - rect.top) * height) / rect.height
	}

	if (isDebugEnabled() && event.type !== 'pointermove') {
		console.debug('[annotation] pointer-point', {
			eventType: event.type,
			clientX: event.clientX,
			clientY: event.clientY,
			svgLeft: rect.left,
			svgTop: rect.top,
			svgCssWidth: rect.width,
			svgCssHeight: rect.height,
			viewBoxWidth: width,
			viewBoxHeight: height,
			pointX: point.x,
			pointY: point.y
		})
	}

	return point
}

export function penPoint(point: AnnotationPoint, event: PointerEvent): AnnotationPoint {
	if (event.pressure === 0.5) {
		return point
	}

	return {
		...point,
		pressure: event.pressure
	}
}

export function logGeometry(
	svgEl: SVGSVGElement,
	overlayMountEl: HTMLElement,
	overlayHost: HTMLElement,
	reason: string,
	event: PointerEvent,
	point: AnnotationPoint
): void {
	const svgRect = svgEl.getBoundingClientRect()
	const mountRect = overlayMountEl.getBoundingClientRect()
	const hostRect = overlayHost.getBoundingClientRect()

	console.debug({
		debugVersion: DEBUG_GEOMETRY_VERSION,
		reason,
		pointerX: event.clientX,
		pointerY: event.clientY,
		pointX: point.x,
		pointY: point.y,
		svgTop: svgRect.top,
		svgLeft: svgRect.left,
		svgWidth: svgRect.width,
		svgHeight: svgRect.height,
		mountTop: mountRect.top,
		mountLeft: mountRect.left,
		hostTop: hostRect.top,
		hostLeft: hostRect.left,
		hostScrollTop: overlayHost.scrollTop,
		hostScrollLeft: overlayHost.scrollLeft
	})
}

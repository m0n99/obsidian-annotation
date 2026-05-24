import getStroke from 'perfect-freehand'
import rough from 'roughjs/bin/rough'
import type { Options } from 'roughjs/bin/core'
import { absolutePoints } from './excalidraw-adapter'
import { generateRoughOptions } from './excalidraw'
import {
	SVG_NS,
	type AnnotationElement,
	type LinearAnnotationElement,
	type FreeDrawAnnotationElement,
	type TextAnnotationElement,
	type AnnotationStyle
} from './types'
import { styleForElement } from './scene'

export function penElementPath(element: FreeDrawAnnotationElement) {
	const style = styleForElement(element)
	const points = absolutePoints(element).filter(
		(point) => Number.isFinite(point.x) && Number.isFinite(point.y)
	)
	if (points.length < 2) {
		return ''
	}

	const stroke = getStroke(
		points.map((point) => [point.x, point.y, point.pressure ?? 0.5]),
		{
			size: style.strokeWidth * 4.25,
			thinning: 0.6,
			smoothing: 0.5,
			streamline: 0.5,
			easing: (t) => Math.sin((t * Math.PI) / 2),
			simulatePressure: element.simulatePressure ?? true,
			last: true
		}
	)

	return getSvgPathFromStroke(stroke)
}

export function getSvgPathFromStroke(stroke: Array<[number, number]>) {
	const validStroke = stroke.filter(
		(point) => Number.isFinite(point[0]) && Number.isFinite(point[1])
	)
	if (!validStroke.length) {
		return ''
	}

	const first = validStroke[0]
	if (!first) {
		return ''
	}

	const average = (a: number, b: number) => (a + b) / 2
	const path = [`M ${first[0]} ${first[1]} Q`]
	for (let index = 0; index < validStroke.length; index++) {
		const point = validStroke[index]
		const next = validStroke[(index + 1) % validStroke.length]
		if (!point || !next) {
			continue
		}

		path.push(
			`${point[0]} ${point[1]} ${average(point[0], next[0])} ${average(point[1], next[1])}`
		)
	}

	path.push('Z')
	return path.join(' ')
}

export function createRoughElementNode(
	element: Exclude<AnnotationElement, FreeDrawAnnotationElement | TextAnnotationElement>,
	style: Required<AnnotationStyle>
) {
	const helperSvg = document.createElementNS(SVG_NS, 'svg')
	const generator = rough.svg(helperSvg)
	const options: Options = {
		stroke: style.strokeColor,
		fill: style.backgroundColor === 'transparent' ? undefined : style.backgroundColor,
		fillStyle: style.backgroundColor === 'transparent' ? undefined : style.fillStyle,
		strokeWidth: style.strokeWidth,
		roughness: style.roughness,
		seed: Math.abs(element.seed) || 1,
		...generateRoughOptions(element as any, false, false)
	}
	applyStrokeStyleOptions(options, style)

	let node: SVGGElement
	if (element.type === 'rectangle') {
		node = generator.rectangle(element.x, element.y, element.width, element.height, options)
	} else if (element.type === 'ellipse') {
		node = generator.ellipse(
			element.x + element.width / 2,
			element.y + element.height / 2,
			element.width,
			element.height,
			options
		)
	} else if (element.type === 'diamond') {
		const cx = element.x + element.width / 2
		const cy = element.y + element.height / 2
		node = generator.polygon(
			[
				[cx, element.y],
				[element.x + element.width, cy],
				[cx, element.y + element.height],
				[element.x, cy]
			],
			options
		)
	} else if (element.type === 'line' || element.type === 'arrow') {
		const points = absolutePoints(element)
		const start = points[0] ?? { x: element.x, y: element.y }
		const end = points.at(-1) ?? start
		node = generator.line(start.x, start.y, end.x, end.y, options)
		if (element.type === 'arrow') {
			node.appendChild(createArrowHead(element, style))
		}
	} else {
		node = document.createElementNS(SVG_NS, 'g')
	}

	node.setAttr('opacity', `${style.opacity / 100}`)
	node.setAttr('data-annotation-id', element.id)
	return node
}

export function createArrowHead(
	element: LinearAnnotationElement,
	style: Required<AnnotationStyle>
) {
	const points = absolutePoints(element)
	const start = points[0] ?? { x: element.x, y: element.y }
	const end = points.at(-1) ?? start
	const angle = Math.atan2(end.y - start.y, end.x - start.x)
	const length = Math.max(10, style.strokeWidth * 5)
	const spread = Math.PI / 7
	const p1 = {
		x: end.x - length * Math.cos(angle - spread),
		y: end.y - length * Math.sin(angle - spread)
	}
	const p2 = {
		x: end.x - length * Math.cos(angle + spread),
		y: end.y - length * Math.sin(angle + spread)
	}
	const group = document.createElementNS(SVG_NS, 'g')
	const lineA = document.createElementNS(SVG_NS, 'line')
	lineA.setAttr('x1', `${end.x}`)
	lineA.setAttr('y1', `${end.y}`)
	lineA.setAttr('x2', `${p1.x}`)
	lineA.setAttr('y2', `${p1.y}`)
	const lineB = document.createElementNS(SVG_NS, 'line')
	lineB.setAttr('x1', `${end.x}`)
	lineB.setAttr('y1', `${end.y}`)
	lineB.setAttr('x2', `${p2.x}`)
	lineB.setAttr('y2', `${p2.y}`)
	for (const line of [lineA, lineB]) {
		line.setAttr('stroke', style.strokeColor)
		line.setAttr('stroke-width', `${style.strokeWidth}`)
		line.setAttr('stroke-linecap', 'round')
		if (style.strokeStyle === 'dotted') {
			line.setAttr(
				'stroke-dasharray',
				dottedDashArray(Math.max(1, style.strokeWidth - 1)).join(' ')
			)
		}
	}
	group.appendChild(lineA)
	group.appendChild(lineB)
	return group
}

function applyStrokeStyleOptions(options: Options, style: Required<AnnotationStyle>) {
	if (style.strokeStyle === 'solid') {
		options.strokeLineDash = undefined
		options.disableMultiStroke = false
		options.strokeWidth = style.strokeWidth
		return
	}

	options.strokeLineDash =
		style.strokeStyle === 'dashed'
			? dashedDashArray(style.strokeWidth)
			: dottedDashArray(style.strokeWidth)
	options.disableMultiStroke = true
	options.strokeWidth = style.strokeWidth + 0.5
	options.fillWeight = style.strokeWidth / 2
	options.hachureGap = style.strokeWidth * 4
}

function dashedDashArray(strokeWidth: number): [number, number] {
	return [8, 8 + strokeWidth]
}

function dottedDashArray(strokeWidth: number): [number, number] {
	return [1.5, 6 + strokeWidth]
}
export function createSvgDefs() {
	const defs = document.createElementNS(SVG_NS, 'defs')
	const marker = document.createElementNS(SVG_NS, 'marker')
	marker.setAttr('id', 'annotation-arrowhead')
	marker.setAttr('viewBox', '0 0 10 10')
	marker.setAttr('refX', '8')
	marker.setAttr('refY', '5')
	marker.setAttr('markerWidth', '7')
	marker.setAttr('markerHeight', '7')
	marker.setAttr('orient', 'auto-start-reverse')
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttr('d', 'M 0 0 L 10 5 L 0 10 z')
	marker.appendChild(path)
	defs.appendChild(marker)
	return defs
}

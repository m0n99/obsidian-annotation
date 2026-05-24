import { SVG_NS } from './types'

// --- Excalidraw-compatible SVG icon factories ---
// These replicate the exact SVG output from Excalidraw's createIcon() function.
// Two viewBox sizes are used, matching upstream:
//   - tablerIconProps:  viewBox="0 0 24 24"  fill="none" stroke-width="2"
//   - modifiedTablerIconProps: viewBox="0 0 20 20"  fill="none" (no stroke-width on root)

function setTablerRoot(svg: SVGSVGElement) {
	svg.setAttribute('viewBox', '0 0 24 24')
	svg.setAttribute('fill', 'none')
	svg.setAttribute('stroke', 'currentColor')
	svg.setAttribute('stroke-width', '2')
	svg.setAttribute('stroke-linecap', 'round')
	svg.setAttribute('stroke-linejoin', 'round')
}

function setModifiedTablerRoot(svg: SVGSVGElement) {
	svg.setAttribute('viewBox', '0 0 20 20')
	svg.setAttribute('fill', 'none')
	svg.setAttribute('stroke', 'currentColor')
	svg.setAttribute('stroke-linecap', 'round')
	svg.setAttribute('stroke-linejoin', 'round')
}

export function createSelectionIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	svg.setAttribute('viewBox', '0 0 22 22')
	svg.setAttribute('fill', 'none')
	svg.setAttribute('stroke-width', '1.25')
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke', 'currentColor')
	g.setAttribute('stroke-linecap', 'round')
	g.setAttribute('stroke-linejoin', 'round')
	const paths: Array<{ attrs: Record<string, string> }> = [
		{ attrs: { stroke: 'none', d: 'M0 0h24v24H0z', fill: 'none' } },
		{
			attrs: {
				d: 'M6 6l4.153 11.793a0.365 .365 0 0 0 .331 .207a0.366 .366 0 0 0 .332 -.207l2.184 -4.793l4.787 -1.994a0.355 .355 0 0 0 .213 -.323a0.355 .355 0 0 0 -.213 -.323l-11.787 -4.36z'
			}
		},
		{ attrs: { d: 'M13.5 13.5l4.5 4.5' } }
	]
	for (const p of paths) {
		const el = document.createElementNS(SVG_NS, 'path')
		for (const [k, v] of Object.entries(p.attrs)) el.setAttribute(k, v)
		g.appendChild(el)
	}
	svg.appendChild(g)
	return svg
}

export function createRectangleIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.5')
	const p1 = document.createElementNS(SVG_NS, 'path')
	p1.setAttribute('stroke', 'none')
	p1.setAttribute('d', 'M0 0h24v24H0z')
	p1.setAttribute('fill', 'none')
	g.appendChild(p1)
	const rect = document.createElementNS(SVG_NS, 'rect')
	rect.setAttribute('x', '4')
	rect.setAttribute('y', '4')
	rect.setAttribute('width', '16')
	rect.setAttribute('height', '16')
	rect.setAttribute('rx', '2')
	g.appendChild(rect)
	svg.appendChild(g)
	return svg
}

export function createDiamondIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.5')
	const p1 = document.createElementNS(SVG_NS, 'path')
	p1.setAttribute('stroke', 'none')
	p1.setAttribute('d', 'M0 0h24v24H0z')
	p1.setAttribute('fill', 'none')
	g.appendChild(p1)
	const p2 = document.createElementNS(SVG_NS, 'path')
	p2.setAttribute(
		'd',
		'M10.5 20.4l-6.9 -6.9c-.781 -.781 -.781 -2.219 0 -3l6.9 -6.9c.781 -.781 2.219 -.781 3 0l6.9 6.9c.781 .781 .781 2.219 0 3l-6.9 6.9c-.781 .781 -2.219 .781 -3 0z'
	)
	g.appendChild(p2)
	svg.appendChild(g)
	return svg
}

export function createEllipseIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.5')
	const p1 = document.createElementNS(SVG_NS, 'path')
	p1.setAttribute('stroke', 'none')
	p1.setAttribute('d', 'M0 0h24v24H0z')
	p1.setAttribute('fill', 'none')
	g.appendChild(p1)
	const circle = document.createElementNS(SVG_NS, 'circle')
	circle.setAttribute('cx', '12')
	circle.setAttribute('cy', '12')
	circle.setAttribute('r', '9')
	g.appendChild(circle)
	svg.appendChild(g)
	return svg
}

export function createArrowIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.5')
	const p1 = document.createElementNS(SVG_NS, 'path')
	p1.setAttribute('stroke', 'none')
	p1.setAttribute('d', 'M0 0h24v24H0z')
	p1.setAttribute('fill', 'none')
	g.appendChild(p1)
	const lines = [
		{ x1: '5', y1: '12', x2: '19', y2: '12' },
		{ x1: '15', y1: '16', x2: '19', y2: '12' },
		{ x1: '15', y1: '8', x2: '19', y2: '12' }
	]
	for (const l of lines) {
		const el = document.createElementNS(SVG_NS, 'line')
		el.setAttribute('x1', l.x1)
		el.setAttribute('y1', l.y1)
		el.setAttribute('x2', l.x2)
		el.setAttribute('y2', l.y2)
		g.appendChild(el)
	}
	svg.appendChild(g)
	return svg
}

export function createLineIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const p = document.createElementNS(SVG_NS, 'path')
	p.setAttribute('d', 'M4.167 10h11.666')
	p.setAttribute('stroke-width', '1.5')
	svg.appendChild(p)
	return svg
}

export function createFreedrawIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.25')
	const p1 = document.createElementNS(SVG_NS, 'path')
	p1.setAttribute('clip-rule', 'evenodd')
	p1.setAttribute(
		'd',
		'm7.643 15.69 7.774-7.773a2.357 2.357 0 1 0-3.334-3.334L4.31 12.357a3.333 3.333 0 0 0-.977 2.357v1.953h1.953c.884 0 1.732-.352 2.357-.977Z'
	)
	g.appendChild(p1)
	const p2 = document.createElementNS(SVG_NS, 'path')
	p2.setAttribute('d', 'm11.25 5.417 3.333 3.333')
	g.appendChild(p2)
	svg.appendChild(g)
	return svg
}

export function createTextIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.5')
	const p1 = document.createElementNS(SVG_NS, 'path')
	p1.setAttribute('stroke', 'none')
	p1.setAttribute('d', 'M0 0h24v24H0z')
	p1.setAttribute('fill', 'none')
	g.appendChild(p1)
	const lines = [
		{ x1: '4', y1: '20', x2: '7', y2: '20' },
		{ x1: '14', y1: '20', x2: '21', y2: '20' },
		{ x1: '6.9', y1: '15', x2: '13.8', y2: '15' },
		{ x1: '10.2', y1: '6.3', x2: '16', y2: '20' }
	]
	for (const l of lines) {
		const el = document.createElementNS(SVG_NS, 'line')
		el.setAttribute('x1', l.x1)
		el.setAttribute('y1', l.y1)
		el.setAttribute('x2', l.x2)
		el.setAttribute('y2', l.y2)
		g.appendChild(el)
	}
	const poly = document.createElementNS(SVG_NS, 'polyline')
	poly.setAttribute('points', '5 20 11 4 13 4 20 20')
	g.appendChild(poly)
	svg.appendChild(g)
	return svg
}

export function createEraserIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.5')
	const p1 = document.createElementNS(SVG_NS, 'path')
	p1.setAttribute('stroke', 'none')
	p1.setAttribute('d', 'M0 0h24v24H0z')
	p1.setAttribute('fill', 'none')
	g.appendChild(p1)
	const p2 = document.createElementNS(SVG_NS, 'path')
	p2.setAttribute(
		'd',
		'M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l10 -10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41l-9.2 9.3'
	)
	g.appendChild(p2)
	const p3 = document.createElementNS(SVG_NS, 'path')
	p3.setAttribute('d', 'M18 13.3l-6.3 -6.3')
	g.appendChild(p3)
	svg.appendChild(g)
	return svg
}

export function createImageIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.25')
	const p1 = document.createElementNS(SVG_NS, 'path')
	p1.setAttribute('d', 'M12.5 6.667h.01')
	g.appendChild(p1)
	const p2 = document.createElementNS(SVG_NS, 'path')
	p2.setAttribute(
		'd',
		'M4.91 2.625h10.18a2.284 2.284 0 0 1 2.285 2.284v10.182a2.284 2.284 0 0 1-2.284 2.284H4.909a2.284 2.284 0 0 1-2.284-2.284V4.909a2.284 2.284 0 0 1 2.284-2.284Z'
	)
	g.appendChild(p2)
	const p3 = document.createElementNS(SVG_NS, 'path')
	p3.setAttribute('d', 'm3.333 12.5 3.334-3.333c.773-.745 1.726-.745 2.5 0l4.166 4.166')
	g.appendChild(p3)
	const p4 = document.createElementNS(SVG_NS, 'path')
	p4.setAttribute('d', 'm11.667 11.667.833-.834c.774-.744 1.726-.744 2.5 0l1.667 1.667')
	g.appendChild(p4)
	svg.appendChild(g)
	return svg
}

export function createStrokeWidthThinIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute('d', 'M4.167 10h11.666')
	path.setAttribute('stroke', 'currentColor')
	path.setAttribute('stroke-width', '1.25')
	path.setAttribute('stroke-linecap', 'round')
	path.setAttribute('stroke-linejoin', 'round')
	svg.appendChild(path)
	return svg
}

export function createStrokeWidthBoldIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute('d', 'M5 10h10')
	path.setAttribute('stroke', 'currentColor')
	path.setAttribute('stroke-width', '2.5')
	path.setAttribute('stroke-linecap', 'round')
	path.setAttribute('stroke-linejoin', 'round')
	svg.appendChild(path)
	return svg
}

export function createStrokeWidthExtraBoldIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute('d', 'M5 10h10')
	path.setAttribute('stroke', 'currentColor')
	path.setAttribute('stroke-width', '3.75')
	path.setAttribute('stroke-linecap', 'round')
	path.setAttribute('stroke-linejoin', 'round')
	svg.appendChild(path)
	return svg
}

export function createRoughnessArchitectIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute(
		'd',
		'M2.5 12.038c1.655-.885 5.9-3.292 8.568-4.354 2.668-1.063.101 2.821 1.32 3.104 1.218.283 5.112-1.814 5.112-1.814'
	)
	path.setAttribute('stroke-width', '1.25')
	svg.appendChild(path)
	return svg
}

export function createRoughnessArtistIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute(
		'd',
		'M2.5 12.563c1.655-.886 5.9-3.293 8.568-4.355 2.668-1.062.101 2.822 1.32 3.105 1.218.283 5.112-1.814 5.112-1.814m-13.469 2.23c2.963-1.586 6.13-5.62 7.468-4.998 1.338.623-1.153 4.11-.132 5.595 1.02 1.487 6.133-1.43 6.133-1.43'
	)
	path.setAttribute('stroke-width', '1.25')
	svg.appendChild(path)
	return svg
}

export function createRoughnessCartoonistIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute(
		'd',
		'M2.5 11.936c1.737-.879 8.627-5.346 10.42-5.268 1.795.078-.418 5.138.345 5.736.763.598 3.53-1.789 4.235-2.147M2.929 9.788c1.164-.519 5.47-3.28 6.987-3.114 1.519.165 1 3.827 2.121 4.109 1.122.281 3.839-2.016 4.606-2.42'
	)
	path.setAttribute('stroke-width', '1.25')
	svg.appendChild(path)
	return svg
}

const HATCHURE_RECT_D =
	'M5.879 2.625h8.242a3.254 3.254 0 0 1 3.254 3.254v8.242a3.254 3.254 0 0 1-3.254 3.254H5.88a3.254 3.254 0 0 1-3.254-3.254V5.88a3.254 3.254 0 0 1 3.254-3.254Z'

export function createFillHachureIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	// Rectangle border (visible stroke, no fill)
	const rect = document.createElementNS(SVG_NS, 'path')
	rect.setAttribute('d', HATCHURE_RECT_D)
	rect.setAttribute('stroke', 'currentColor')
	rect.setAttribute('stroke-width', '1.25')
	svg.appendChild(rect)
	// Mask: same rect with fill+stroke defines the clip region
	const mask = document.createElementNS(SVG_NS, 'mask')
	mask.setAttribute('id', 'FillHatchureIcon')
	// eslint-disable-next-line obsidianmd/no-static-styles-assignment
	mask.style.setProperty('mask-type', 'alpha')
	mask.setAttribute('maskUnits', 'userSpaceOnUse')
	mask.setAttribute('x', '2')
	mask.setAttribute('y', '2')
	mask.setAttribute('width', '16')
	mask.setAttribute('height', '16')
	const maskRect = document.createElementNS(SVG_NS, 'path')
	maskRect.setAttribute('d', HATCHURE_RECT_D)
	maskRect.setAttribute('fill', 'currentColor')
	maskRect.setAttribute('stroke', 'currentColor')
	maskRect.setAttribute('stroke-width', '1.25')
	mask.appendChild(maskRect)
	svg.appendChild(mask)
	// Hatch lines clipped by the mask
	const maskedGroup = document.createElementNS(SVG_NS, 'g')
	maskedGroup.setAttribute('mask', 'url(#FillHatchureIcon)')
	const lines = document.createElementNS(SVG_NS, 'path')
	lines.setAttribute(
		'd',
		'M2.258 15.156 15.156 2.258M7.324 20.222 20.222 7.325m-20.444 5.35L12.675-.222m-8.157 18.34L17.416 5.22'
	)
	lines.setAttribute('stroke', 'currentColor')
	lines.setAttribute('stroke-width', '1.25')
	lines.setAttribute('stroke-linecap', 'round')
	lines.setAttribute('stroke-linejoin', 'round')
	maskedGroup.appendChild(lines)
	svg.appendChild(maskedGroup)
	return svg
}

export function createFillCrossHatchIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	// Clipped group to the 20x20 viewBox
	const clippedGroup = document.createElementNS(SVG_NS, 'g')
	clippedGroup.setAttribute('clip-path', 'url(#a)')
	// Rectangle border
	const rect = document.createElementNS(SVG_NS, 'path')
	rect.setAttribute('d', HATCHURE_RECT_D)
	rect.setAttribute('stroke', 'currentColor')
	rect.setAttribute('stroke-width', '1.25')
	clippedGroup.appendChild(rect)
	// Mask: the cross-hatch lines define the visible pattern
	const mask = document.createElementNS(SVG_NS, 'mask')
	mask.setAttribute('id', 'FillCrossHatchIcon')
	// eslint-disable-next-line obsidianmd/no-static-styles-assignment
	mask.style.setProperty('mask-type', 'alpha')
	mask.setAttribute('maskUnits', 'userSpaceOnUse')
	mask.setAttribute('x', '-1')
	mask.setAttribute('y', '-1')
	mask.setAttribute('width', '22')
	mask.setAttribute('height', '22')
	const maskLines = document.createElementNS(SVG_NS, 'path')
	maskLines.setAttribute(
		'd',
		'M2.426 15.044 15.044 2.426M7.383 20 20 7.383M0 12.617 12.617 0m-7.98 17.941L17.256 5.324m-2.211 12.25L2.426 4.956M20 12.617 7.383 0m5.234 20L0 7.383m17.941 7.98L5.324 2.745'
	)
	maskLines.setAttribute('stroke', 'currentColor')
	maskLines.setAttribute('stroke-width', '1.25')
	maskLines.setAttribute('stroke-linecap', 'round')
	maskLines.setAttribute('stroke-linejoin', 'round')
	mask.appendChild(maskLines)
	clippedGroup.appendChild(mask)
	// Filled rectangle revealed through the cross-hatch mask
	const maskedGroup = document.createElementNS(SVG_NS, 'g')
	maskedGroup.setAttribute('mask', 'url(#FillCrossHatchIcon)')
	const fillRect = document.createElementNS(SVG_NS, 'path')
	fillRect.setAttribute(
		'd',
		'M14.121 2H5.88A3.879 3.879 0 0 0 2 5.879v8.242A3.879 3.879 0 0 0 5.879 18h8.242A3.879 3.879 0 0 0 18 14.121V5.88A3.879 3.879 0 0 0 14.121 2Z'
	)
	fillRect.setAttribute('fill', 'currentColor')
	maskedGroup.appendChild(fillRect)
	clippedGroup.appendChild(maskedGroup)
	svg.appendChild(clippedGroup)
	// ClipPath definition
	const defs = document.createElementNS(SVG_NS, 'defs')
	const clipPath = document.createElementNS(SVG_NS, 'clipPath')
	clipPath.setAttribute('id', 'a')
	const clipRect = document.createElementNS(SVG_NS, 'path')
	clipRect.setAttribute('fill', '#fff')
	clipRect.setAttribute('d', 'M0 0h20v20H0z')
	clipPath.appendChild(clipRect)
	defs.appendChild(clipPath)
	svg.appendChild(defs)
	return svg
}

export function createFillSolidIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	svg.setAttribute('fill', 'currentColor')
	// Clipped group
	const clippedGroup = document.createElementNS(SVG_NS, 'g')
	clippedGroup.setAttribute('clip-path', 'url(#a)')
	const rect = document.createElementNS(SVG_NS, 'path')
	rect.setAttribute(
		'd',
		'M4.91 2.625h10.18a2.284 2.284 0 0 1 2.285 2.284v10.182a2.284 2.284 0 0 1-2.284 2.284H4.909a2.284 2.284 0 0 1-2.284-2.284V4.909a2.284 2.284 0 0 1 2.284-2.284Z'
	)
	rect.setAttribute('stroke', 'currentColor')
	rect.setAttribute('stroke-width', '1.25')
	clippedGroup.appendChild(rect)
	svg.appendChild(clippedGroup)
	// ClipPath definition
	const defs = document.createElementNS(SVG_NS, 'defs')
	const clipPath = document.createElementNS(SVG_NS, 'clipPath')
	clipPath.setAttribute('id', 'a')
	const clipRect = document.createElementNS(SVG_NS, 'path')
	clipRect.setAttribute('fill', '#fff')
	clipRect.setAttribute('d', 'M0 0h20v20H0z')
	clipPath.appendChild(clipRect)
	defs.appendChild(clipPath)
	svg.appendChild(defs)
	return svg
}

export function createFillZigZagIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.25')
	// Rectangle border
	const rect = document.createElementNS(SVG_NS, 'path')
	rect.setAttribute('d', HATCHURE_RECT_D)
	rect.setAttribute('stroke', 'currentColor')
	rect.setAttribute('stroke-width', '1.25')
	g.appendChild(rect)
	// Zigzag lines inside the rectangle
	const zigzag = document.createElementNS(SVG_NS, 'path')
	zigzag.setAttribute(
		'd',
		'M4.518 16.118l7.608-12.83m.198 13.934 5.051-9.897M2.778 9.675l9.348-6.387m-7.608 12.83 12.857-8.793'
	)
	zigzag.setAttribute('stroke', 'currentColor')
	zigzag.setAttribute('stroke-width', '1.25')
	zigzag.setAttribute('stroke-linecap', 'round')
	zigzag.setAttribute('stroke-linejoin', 'round')
	g.appendChild(zigzag)
	svg.appendChild(g)
	return svg
}

export function createStrokeStyleSolidIcon(): SVGSVGElement {
	return createStrokeWidthThinIcon()
}

export function createStrokeIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1')
	const bg = document.createElementNS(SVG_NS, 'path')
	bg.setAttribute('stroke', 'none')
	bg.setAttribute('d', 'M0 0h24v24H0z')
	bg.setAttribute('fill', 'none')
	g.appendChild(bg)
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute('d', 'M6 10l4 -4 L6 14l8 -8 L6 18l12 -12 L10 18l8 -8 L14 18l4 -4')
	g.appendChild(path)
	svg.appendChild(g)
	return svg
}

export function createStrokeStyleDashedIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '2')
	const bg = document.createElementNS(SVG_NS, 'path')
	bg.setAttribute('stroke', 'none')
	bg.setAttribute('d', 'M0 0h24v24H0z')
	bg.setAttribute('fill', 'none')
	g.appendChild(bg)
	for (const d of ['M5 12h2', 'M17 12h2', 'M11 12h2']) {
		const p = document.createElementNS(SVG_NS, 'path')
		p.setAttribute('d', d)
		g.appendChild(p)
	}
	svg.appendChild(g)
	return svg
}

export function createStrokeStyleDottedIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '2')
	const bg = document.createElementNS(SVG_NS, 'path')
	bg.setAttribute('stroke', 'none')
	bg.setAttribute('d', 'M0 0h24v24H0z')
	bg.setAttribute('fill', 'none')
	g.appendChild(bg)
	for (const d of ['M4 12v.01', 'M8 12v.01', 'M12 12v.01', 'M16 12v.01', 'M20 12v.01']) {
		const p = document.createElementNS(SVG_NS, 'path')
		p.setAttribute('d', d)
		g.appendChild(p)
	}
	svg.appendChild(g)
	return svg
}

export function createEdgeSharpIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.5')
	const corner = document.createElementNS(SVG_NS, 'path')
	corner.setAttribute(
		'd',
		'M3.33334 9.99998V6.66665C3.33334 6.04326 3.33403 4.9332 3.33539 3.33646C4.95233 3.33436 6.06276 3.33331 6.66668 3.33331H10'
	)
	g.appendChild(corner)
	for (const d of [
		'M13.3333 3.33331V3.34331',
		'M16.6667 3.33331V3.34331',
		'M16.6667 6.66669V6.67669',
		'M16.6667 10V10.01',
		'M3.33334 13.3333V13.3433',
		'M16.6667 13.3333V13.3433',
		'M3.33334 16.6667V16.6767',
		'M6.66666 16.6667V16.6767',
		'M10 16.6667V16.6767',
		'M13.3333 16.6667V16.6767',
		'M16.6667 16.6667V16.6767'
	]) {
		const p = document.createElementNS(SVG_NS, 'path')
		p.setAttribute('d', d)
		g.appendChild(p)
	}
	svg.appendChild(g)
	return svg
}

export function createEdgeRoundIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.5')
	g.setAttribute('stroke-linecap', 'round')
	g.setAttribute('stroke-linejoin', 'round')
	const bg = document.createElementNS(SVG_NS, 'path')
	bg.setAttribute('stroke', 'none')
	bg.setAttribute('d', 'M0 0h24v24H0z')
	bg.setAttribute('fill', 'none')
	g.appendChild(bg)
	const curve = document.createElementNS(SVG_NS, 'path')
	curve.setAttribute('d', 'M4 12v-4a4 4 0 0 1 4 -4h4')
	g.appendChild(curve)
	for (const attrs of [
		{ x1: '16', y1: '4', x2: '16', y2: '4.01' },
		{ x1: '20', y1: '4', x2: '20', y2: '4.01' },
		{ x1: '20', y1: '8', x2: '20', y2: '8.01' },
		{ x1: '20', y1: '12', x2: '20', y2: '12.01' },
		{ x1: '4', y1: '16', x2: '4', y2: '16.01' },
		{ x1: '20', y1: '16', x2: '20', y2: '16.01' },
		{ x1: '4', y1: '20', x2: '4', y2: '20.01' },
		{ x1: '8', y1: '20', x2: '8', y2: '20.01' },
		{ x1: '12', y1: '20', x2: '12', y2: '20.01' },
		{ x1: '16', y1: '20', x2: '16', y2: '20.01' },
		{ x1: '20', y1: '20', x2: '20', y2: '20.01' }
	]) {
		const line = document.createElementNS(SVG_NS, 'line')
		line.setAttribute('x1', attrs.x1)
		line.setAttribute('y1', attrs.y1)
		line.setAttribute('x2', attrs.x2)
		line.setAttribute('y2', attrs.y2)
		g.appendChild(line)
	}
	svg.appendChild(g)
	return svg
}

export function createBringForwardIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.5')
	for (const attrs of [
		{ stroke: 'none', d: 'M0 0h24v24H0z', fill: 'none' },
		{ d: 'M12 5l0 14' },
		{ d: 'M16 9l-4 -4' },
		{ d: 'M8 9l4 -4' }
	]) {
		const path = document.createElementNS(SVG_NS, 'path')
		for (const [key, value] of Object.entries(attrs)) path.setAttribute(key, value)
		g.appendChild(path)
	}
	svg.appendChild(g)
	return svg
}

export function createSendBackwardIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.5')
	for (const attrs of [
		{ stroke: 'none', d: 'M0 0h24v24H0z', fill: 'none' },
		{ d: 'M12 5l0 14' },
		{ d: 'M16 9l-4 -4' },
		{ d: 'M8 9l4 -4' }
	]) {
		const path = document.createElementNS(SVG_NS, 'path')
		for (const [key, value] of Object.entries(attrs)) path.setAttribute(key, value)
		g.appendChild(path)
	}
	svg.appendChild(g)
	svg.style.transform = 'rotate(180deg)'
	return svg
}

export function createBringToFrontIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.5')
	for (const attrs of [
		{ stroke: 'none', d: 'M0 0h24v24H0z', fill: 'none' },
		{ d: 'M12 10l0 10' },
		{ d: 'M12 10l4 4' },
		{ d: 'M12 10l-4 4' },
		{ d: 'M4 4l16 0' }
	]) {
		const path = document.createElementNS(SVG_NS, 'path')
		for (const [key, value] of Object.entries(attrs)) path.setAttribute(key, value)
		g.appendChild(path)
	}
	svg.appendChild(g)
	return svg
}

export function createSendToBackIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.5')
	for (const attrs of [
		{ stroke: 'none', d: 'M0 0h24v24H0z', fill: 'none' },
		{ d: 'M12 10l0 10' },
		{ d: 'M12 10l4 4' },
		{ d: 'M12 10l-4 4' },
		{ d: 'M4 4l16 0' }
	]) {
		const path = document.createElementNS(SVG_NS, 'path')
		for (const [key, value] of Object.entries(attrs)) path.setAttribute(key, value)
		g.appendChild(path)
	}
	svg.appendChild(g)
	svg.style.transform = 'rotate(180deg)'
	return svg
}

export function createUndoIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute(
		'd',
		'M7.5 10.833 4.167 7.5 7.5 4.167M4.167 7.5h9.166a3.333 3.333 0 0 1 0 6.667H12.5'
	)
	path.setAttribute('stroke-width', '1.25')
	svg.appendChild(path)
	return svg
}

export function createRedoIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute(
		'd',
		'M12.5 10.833 15.833 7.5 12.5 4.167M15.833 7.5H6.667a3.333 3.333 0 1 0 0 6.667H7.5'
	)
	path.setAttribute('stroke-width', '1.25')
	svg.appendChild(path)
	return svg
}

export function createDuplicateIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.25')
	const paths = [
		{
			d: 'M14.375 6.458H8.958a2.5 2.5 0 0 0-2.5 2.5v5.417a2.5 2.5 0 0 0 2.5 2.5h5.417a2.5 2.5 0 0 0 2.5-2.5V8.958a2.5 2.5 0 0 0-2.5-2.5Z'
		},
		{
			clipRule: 'evenodd',
			d: 'M11.667 3.125c.517 0 .986.21 1.325.55.34.338.55.807.55 1.325v1.458H8.333c-.485 0-.927.185-1.26.487-.343.312-.57.75-.609 1.24l-.005 5.357H5a1.87 1.87 0 0 1-1.326-.55 1.87 1.87 0 0 1-.549-1.325V5c0-.518.21-.987.55-1.326.338-.34.807-.549 1.325-.549h6.667Z'
		}
	]
	for (const attrs of paths) {
		const path = document.createElementNS(SVG_NS, 'path')
		path.setAttribute('d', attrs.d)
		if (attrs.clipRule) path.setAttribute('clip-rule', attrs.clipRule)
		g.appendChild(path)
	}
	svg.appendChild(g)
	return svg
}

export function createTrashIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute('stroke-width', '1.25')
	path.setAttribute(
		'd',
		'M3.333 5.833h13.334M8.333 9.167v5M11.667 9.167v5M4.167 5.833l.833 10c0 .92.746 1.667 1.667 1.667h6.666c.92 0 1.667-.746 1.667-1.667l.833-10M7.5 5.833v-2.5c0-.46.373-.833.833-.833h3.334c.46 0 .833.373.833.833v2.5'
	)
	svg.appendChild(path)
	return svg
}

export function createTextAlignLeftIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke', 'currentColor')
	g.setAttribute('fill', 'none')
	g.setAttribute('stroke-linecap', 'round')
	g.setAttribute('stroke-linejoin', 'round')
	g.setAttribute('stroke-width', '2')
	const p1 = document.createElementNS(SVG_NS, 'path')
	p1.setAttribute('stroke', 'none')
	p1.setAttribute('d', 'M0 0h24v24H0z')
	p1.setAttribute('fill', 'none')
	g.appendChild(p1)
	for (const attrs of [
		{ x1: '4', y1: '8', x2: '20', y2: '8' },
		{ x1: '4', y1: '12', x2: '12', y2: '12' },
		{ x1: '4', y1: '16', x2: '16', y2: '16' }
	]) {
		const line = document.createElementNS(SVG_NS, 'line')
		line.setAttribute('x1', attrs.x1)
		line.setAttribute('y1', attrs.y1)
		line.setAttribute('x2', attrs.x2)
		line.setAttribute('y2', attrs.y2)
		g.appendChild(line)
	}
	svg.appendChild(g)
	return svg
}

export function createTextAlignCenterIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke', 'currentColor')
	g.setAttribute('fill', 'none')
	g.setAttribute('stroke-linecap', 'round')
	g.setAttribute('stroke-linejoin', 'round')
	const p1 = document.createElementNS(SVG_NS, 'path')
	p1.setAttribute('stroke', 'none')
	p1.setAttribute('d', 'M0 0h24v24H0z')
	p1.setAttribute('fill', 'none')
	g.appendChild(p1)
	for (const attrs of [
		{ x1: '4', y1: '8', x2: '20', y2: '8' },
		{ x1: '8', y1: '12', x2: '16', y2: '12' },
		{ x1: '6', y1: '16', x2: '18', y2: '16' }
	]) {
		const line = document.createElementNS(SVG_NS, 'line')
		line.setAttribute('x1', attrs.x1)
		line.setAttribute('y1', attrs.y1)
		line.setAttribute('x2', attrs.x2)
		line.setAttribute('y2', attrs.y2)
		g.appendChild(line)
	}
	svg.appendChild(g)
	return svg
}

export function createTextAlignRightIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke', 'currentColor')
	g.setAttribute('fill', 'none')
	g.setAttribute('stroke-linecap', 'round')
	g.setAttribute('stroke-linejoin', 'round')
	const p1 = document.createElementNS(SVG_NS, 'path')
	p1.setAttribute('stroke', 'none')
	p1.setAttribute('d', 'M0 0h24v24H0z')
	p1.setAttribute('fill', 'none')
	g.appendChild(p1)
	for (const attrs of [
		{ x1: '4', y1: '8', x2: '20', y2: '8' },
		{ x1: '10', y1: '12', x2: '20', y2: '12' },
		{ x1: '8', y1: '16', x2: '20', y2: '16' }
	]) {
		const line = document.createElementNS(SVG_NS, 'line')
		line.setAttribute('x1', attrs.x1)
		line.setAttribute('y1', attrs.y1)
		line.setAttribute('x2', attrs.x2)
		line.setAttribute('y2', attrs.y2)
		g.appendChild(line)
	}
	svg.appendChild(g)
	return svg
}

export function createFontSizeSmallIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const defs = document.createElementNS(SVG_NS, 'defs')
	const clipPath = document.createElementNS(SVG_NS, 'clipPath')
	clipPath.setAttribute('id', 'FontSizeSmall')
	const clipRect = document.createElementNS(SVG_NS, 'path')
	clipRect.setAttribute('fill', '#fff')
	clipRect.setAttribute('d', 'M0 0h20v20H0z')
	clipPath.appendChild(clipRect)
	defs.appendChild(clipPath)
	svg.appendChild(defs)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('clip-path', 'url(#FontSizeSmall)')
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute(
		'd',
		'M14.167 6.667a3.333 3.333 0 0 0-3.334-3.334H9.167a3.333 3.333 0 0 0 0 6.667h1.666a3.333 3.333 0 0 1 0 6.667H9.167a3.333 3.333 0 0 1-3.334-3.334'
	)
	path.setAttribute('stroke', 'currentColor')
	path.setAttribute('stroke-width', '1.25')
	path.setAttribute('stroke-linecap', 'round')
	path.setAttribute('stroke-linejoin', 'round')
	g.appendChild(path)
	svg.appendChild(g)
	return svg
}

export function createFontSizeMediumIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const defs = document.createElementNS(SVG_NS, 'defs')
	const clipPath = document.createElementNS(SVG_NS, 'clipPath')
	clipPath.setAttribute('id', 'FontSizeMedium')
	const clipRect = document.createElementNS(SVG_NS, 'path')
	clipRect.setAttribute('fill', '#fff')
	clipRect.setAttribute('d', 'M0 0h20v20H0z')
	clipPath.appendChild(clipRect)
	defs.appendChild(clipPath)
	svg.appendChild(defs)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('clip-path', 'url(#FontSizeMedium)')
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute('d', 'M5 16.667V3.333L10 15l5-11.667v13.334')
	path.setAttribute('stroke', 'currentColor')
	path.setAttribute('stroke-width', '1.25')
	path.setAttribute('stroke-linecap', 'round')
	path.setAttribute('stroke-linejoin', 'round')
	g.appendChild(path)
	svg.appendChild(g)
	return svg
}

export function createFontSizeLargeIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const defs = document.createElementNS(SVG_NS, 'defs')
	const clipPath = document.createElementNS(SVG_NS, 'clipPath')
	clipPath.setAttribute('id', 'FontSizeLarge')
	const clipRect = document.createElementNS(SVG_NS, 'path')
	clipRect.setAttribute('fill', '#fff')
	clipRect.setAttribute('d', 'M0 0h20v20H0z')
	clipPath.appendChild(clipRect)
	defs.appendChild(clipPath)
	svg.appendChild(defs)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('clip-path', 'url(#FontSizeLarge)')
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute('d', 'M5.833 3.333v13.334h8.334')
	path.setAttribute('stroke', 'currentColor')
	path.setAttribute('stroke-width', '1.25')
	path.setAttribute('stroke-linecap', 'round')
	path.setAttribute('stroke-linejoin', 'round')
	g.appendChild(path)
	svg.appendChild(g)
	return svg
}

export function createFontSizeExtraLargeIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute(
		'd',
		'm1.667 3.333 6.666 13.334M8.333 3.333 1.667 16.667M11.667 3.333v13.334h6.666'
	)
	path.setAttribute('stroke', 'currentColor')
	path.setAttribute('stroke-width', '1.25')
	path.setAttribute('stroke-linecap', 'round')
	path.setAttribute('stroke-linejoin', 'round')
	svg.appendChild(path)
	return svg
}

export function createFontFamilyHandDrawnIcon(): SVGSVGElement {
	return createFreedrawIcon()
}

export function createFontFamilyNormalIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke', 'currentColor')
	g.setAttribute('stroke-width', '1.25')
	g.setAttribute('stroke-linecap', 'round')
	g.setAttribute('stroke-linejoin', 'round')
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute(
		'd',
		'M5.833 16.667v-10a3.333 3.333 0 0 1 3.334-3.334h1.666a3.333 3.333 0 0 1 3.334 3.334v10M5.833 10.833h8.334'
	)
	g.appendChild(path)
	svg.appendChild(g)
	return svg
}

export function createFontFamilyCodeIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.5')
	const p1 = document.createElementNS(SVG_NS, 'path')
	p1.setAttribute('stroke', 'none')
	p1.setAttribute('d', 'M0 0h24v24H0z')
	p1.setAttribute('fill', 'none')
	g.appendChild(p1)
	for (const d of ['M7 8l-4 4l4 4', 'M17 8l4 4l-4 4', 'M14 4l-4 16']) {
		const path = document.createElementNS(SVG_NS, 'path')
		path.setAttribute('d', d)
		g.appendChild(path)
	}
	svg.appendChild(g)
	return svg
}

export function createLockedIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	g.setAttribute('stroke-width', '1.25')
	for (const d of [
		'M13.542 8.542H6.458a2.5 2.5 0 0 0-2.5 2.5v3.75a2.5 2.5 0 0 0 2.5 2.5h7.084a2.5 2.5 0 0 0 2.5-2.5v-3.75a2.5 2.5 0 0 0-2.5-2.5Z',
		'M10 13.958a1.042 1.042 0 1 0 0-2.083 1.042 1.042 0 0 0 0 2.083Z',
		'M6.667 8.333V5.417C6.667 3.806 8.159 2.5 10 2.5c1.841 0 3.333 1.306 3.333 2.917v2.916'
	]) {
		const path = document.createElementNS(SVG_NS, 'path')
		path.setAttribute('d', d)
		g.appendChild(path)
	}
	svg.appendChild(g)
	return svg
}

export function createUnlockedIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg')
	setModifiedTablerRoot(svg)
	const g = document.createElementNS(SVG_NS, 'g')
	for (const d of [
		'M13.542 8.542H6.458a2.5 2.5 0 0 0-2.5 2.5v3.75a2.5 2.5 0 0 0 2.5 2.5h7.084a2.5 2.5 0 0 0 2.5-2.5v-3.75a2.5 2.5 0 0 0-2.5-2.5Z',
		'M10 13.958a1.042 1.042 0 1 0 0-2.083 1.042 1.042 0 0 0 0 2.083Z'
	]) {
		const path = document.createElementNS(SVG_NS, 'path')
		path.setAttribute('d', d)
		path.setAttribute('stroke', 'currentColor')
		path.setAttribute('stroke-width', '1.25')
		g.appendChild(path)
	}
	const mask = document.createElementNS(SVG_NS, 'mask')
	mask.setAttribute('id', 'UnlockedIcon')
	// eslint-disable-next-line obsidianmd/no-static-styles-assignment
	mask.style.setProperty('mask-type', 'alpha')
	mask.setAttribute('maskUnits', 'userSpaceOnUse')
	mask.setAttribute('x', '6')
	mask.setAttribute('y', '1')
	mask.setAttribute('width', '9')
	mask.setAttribute('height', '9')
	const maskPath = document.createElementNS(SVG_NS, 'path')
	maskPath.setAttribute('stroke', 'none')
	maskPath.setAttribute(
		'd',
		'M6.399 9.561V5.175c0-.93.401-1.823 1.116-2.48a3.981 3.981 0 0 1 2.693-1.028c1.01 0 1.98.37 2.694 1.027.715.658 1.116 1.55 1.116 2.481'
	)
	maskPath.setAttribute('fill', '#fff')
	mask.appendChild(maskPath)
	g.appendChild(mask)
	const maskedGroup = document.createElementNS(SVG_NS, 'g')
	maskedGroup.setAttribute('mask', 'url(#UnlockedIcon)')
	const fillPath = document.createElementNS(SVG_NS, 'path')
	fillPath.setAttribute('stroke', 'none')
	fillPath.setAttribute(
		'd',
		'M5.149 9.561v1.25h2.5v-1.25h-2.5Zm5.06-7.894V.417v1.25Zm2.559 3.508v1.25h2.5v-1.25h-2.5ZM7.648 8.51V5.175h-2.5V8.51h2.5Zm0-3.334c0-.564.243-1.128.713-1.561L6.668 1.775c-.959.883-1.52 2.104-1.52 3.4h2.5Zm.713-1.561a2.732 2.732 0 0 1 1.847-.697v-2.5c-1.31 0-2.585.478-3.54 1.358L8.36 3.614Zm1.847-.697c.71 0 1.374.26 1.847.697l1.694-1.839a5.231 5.231 0 0 0-3.54-1.358v2.5Zm1.847.697c.47.433.713.997.713 1.561h2.5c0-1.296-.56-2.517-1.52-3.4l-1.693 1.839Z'
	)
	fillPath.setAttribute('fill', 'currentColor')
	maskedGroup.appendChild(fillPath)
	g.appendChild(maskedGroup)
	svg.appendChild(g)
	return svg
}

import type { AnnotationStyle } from './drawing/types'
import {
	COLOR_OUTLINE_CONTRAST_THRESHOLD,
	DEFAULT_ELEMENT_BACKGROUND_PICKS,
	DEFAULT_ELEMENT_STROKE_PICKS,
	ROUGHNESS,
	STROKE_WIDTH,
	isColorDark
} from './drawing/excalidraw'
import {
	createBringForwardIcon,
	createBringToFrontIcon,
	createDuplicateIcon,
	createEdgeRoundIcon,
	createEdgeSharpIcon,
	createFillCrossHatchIcon,
	createFillHachureIcon,
	createFillSolidIcon,
	createFillZigZagIcon,
	createRoughnessArchitectIcon,
	createRoughnessArtistIcon,
	createRoughnessCartoonistIcon,
	createSendBackwardIcon,
	createSendToBackIcon,
	createStrokeStyleDashedIcon,
	createStrokeStyleDottedIcon,
	createStrokeStyleSolidIcon,
	createStrokeWidthBoldIcon,
	createStrokeWidthExtraBoldIcon,
	createStrokeWidthThinIcon,
	createTrashIcon
} from './drawing/icons'
import type { OverlayLayerDirection } from './overlay-toolbar'

export type StyleControlsState = {
	style: Required<AnnotationStyle>
}

export type StyleControlsCallbacks = {
	updateStyle(style: Partial<Required<AnnotationStyle>>): void
	updateOpacity(opacity: number): void
	duplicateSelected(): void
	deleteSelected(): void
	moveLayer(direction: OverlayLayerDirection): void
}

export function renderStyleControls(
	container: HTMLElement,
	state: StyleControlsState,
	callbacks: StyleControlsCallbacks
) {
	const strokeColors = DEFAULT_ELEMENT_STROKE_PICKS
	const fillColors = DEFAULT_ELEMENT_BACKGROUND_PICKS
	const fillStyles: Array<{
		value: 'hachure' | 'cross-hatch' | 'solid'
		icon: () => SVGSVGElement
		title: string
	}> = [
		{ value: 'hachure', icon: createFillHachureIcon, title: 'Hachure' },
		{ value: 'cross-hatch', icon: createFillCrossHatchIcon, title: 'Cross-hatch' },
		{ value: 'solid', icon: createFillSolidIcon, title: 'Solid' }
	]
	const strokeWidths: Array<{ value: number; icon: () => SVGSVGElement; title: string }> = [
		{ value: STROKE_WIDTH.thin, icon: createStrokeWidthThinIcon, title: 'Thin' },
		{ value: STROKE_WIDTH.bold, icon: createStrokeWidthBoldIcon, title: 'Bold' },
		{ value: STROKE_WIDTH.extraBold, icon: createStrokeWidthExtraBoldIcon, title: 'Extra bold' }
	]
	const strokeStyles: Array<{
		value: 'solid' | 'dashed' | 'dotted'
		icon: () => SVGSVGElement
		title: string
	}> = [
		{ value: 'solid', icon: createStrokeStyleSolidIcon, title: 'Solid' },
		{ value: 'dashed', icon: createStrokeStyleDashedIcon, title: 'Dashed' },
		{ value: 'dotted', icon: createStrokeStyleDottedIcon, title: 'Dotted' }
	]
	const roughnesses: Array<{ value: number; icon: () => SVGSVGElement; title: string }> = [
		{ value: ROUGHNESS.architect, icon: createRoughnessArchitectIcon, title: 'Architect' },
		{ value: ROUGHNESS.artist, icon: createRoughnessArtistIcon, title: 'Artist' },
		{ value: ROUGHNESS.cartoonist, icon: createRoughnessCartoonistIcon, title: 'Cartoonist' }
	]
	const edges: Array<{ value: 'sharp' | 'round'; icon: () => SVGSVGElement; title: string }> = [
		{ value: 'sharp', icon: createEdgeSharpIcon, title: 'Sharp' },
		{ value: 'round', icon: createEdgeRoundIcon, title: 'Round' }
	]
	const actions: Array<{ icon: () => SVGSVGElement; title: string; action: () => void }> = [
		{
			icon: createDuplicateIcon,
			title: 'Duplicate',
			action: () => callbacks.duplicateSelected()
		},
		{ icon: createTrashIcon, title: 'Delete', action: () => callbacks.deleteSelected() }
	]
	const layers: Array<{ icon: () => SVGSVGElement; title: string; action: () => void }> = [
		{
			icon: createSendToBackIcon,
			title: 'Send to back',
			action: () => callbacks.moveLayer('back')
		},
		{
			icon: createSendBackwardIcon,
			title: 'Send backward',
			action: () => callbacks.moveLayer('backward')
		},
		{
			icon: createBringForwardIcon,
			title: 'Bring forward',
			action: () => callbacks.moveLayer('forward')
		},
		{
			icon: createBringToFrontIcon,
			title: 'Bring to front',
			action: () => callbacks.moveLayer('front')
		}
	]

	const strokeFieldset = container.createEl('fieldset')
	strokeFieldset.createEl('legend', { text: 'Stroke' })
	renderColorRow(
		strokeFieldset,
		strokeColors,
		'Stroke',
		'stroke',
		(color) => {
			callbacks.updateStyle({ strokeColor: color })
		},
		() => state.style.strokeColor
	)

	const bgFieldset = container.createEl('fieldset')
	bgFieldset.createEl('legend', { text: 'Background' })
	renderColorRow(
		bgFieldset,
		fillColors,
		'Background',
		'background',
		(color) => {
			callbacks.updateStyle({ backgroundColor: color })
		},
		() => state.style.backgroundColor
	)

	// Fill style — Alt+Click on Hachure toggles to Zigzag (matches Excalidraw)
	const allZigZag = state.style.fillStyle === 'zigzag'
	const fillFieldset = container.createEl('fieldset')
	fillFieldset.createEl('legend', { text: 'Fill' })
	const fillList = fillFieldset.createDiv({ cls: 'buttonList' })
	for (const { value, icon, title } of fillStyles) {
		const isHachureToggle = value === 'hachure'
		const displayIcon = isHachureToggle && allZigZag ? createFillZigZagIcon : icon
		const displayTitle = isHachureToggle && allZigZag ? 'Zigzag' : title
		const isActive = isHachureToggle
			? state.style.fillStyle === 'hachure' || state.style.fillStyle === 'zigzag'
			: state.style.fillStyle === value
		const label = fillList.createEl('label', { attr: { title: displayTitle } })
		label.createEl('input', { type: 'radio', attr: { name: 'annotation-fill-style' } })
		label.appendChild(displayIcon())
		if (isActive) {
			label.addClass('active')
		}
		label.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			if (isHachureToggle) {
				const nextValue =
					event.altKey && state.style.fillStyle === 'hachure'
						? ('zigzag' as const)
						: event.altKey && state.style.fillStyle === 'zigzag'
							? ('hachure' as const)
							: state.style.fillStyle === 'zigzag'
								? ('zigzag' as const)
								: ('hachure' as const)
				callbacks.updateStyle({ fillStyle: nextValue })
			} else {
				callbacks.updateStyle({ fillStyle: value })
			}
		})
	}

	// Stroke width
	const widthFieldset = container.createEl('fieldset')
	widthFieldset.createEl('legend', { text: 'Stroke width' })
	const widthList = widthFieldset.createDiv({ cls: 'buttonList' })
	for (const { value, icon, title } of strokeWidths) {
		const label = widthList.createEl('label', { attr: { title } })
		label.createEl('input', { type: 'radio', attr: { name: 'annotation-stroke-width' } })
		label.appendChild(icon())
		if (state.style.strokeWidth === value) {
			label.addClass('active')
		}
		label.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			callbacks.updateStyle({ strokeWidth: value })
		})
	}

	// Stroke style
	const styleFieldset = container.createEl('fieldset')
	styleFieldset.createEl('legend', { text: 'Stroke style' })
	const styleList = styleFieldset.createDiv({ cls: 'buttonList' })
	for (const { value, icon, title } of strokeStyles) {
		const label = styleList.createEl('label', { attr: { title } })
		label.createEl('input', { type: 'radio', attr: { name: 'annotation-stroke-style' } })
		label.appendChild(icon())
		if (state.style.strokeStyle === value) {
			label.addClass('active')
		}
		label.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			callbacks.updateStyle({ strokeStyle: value })
		})
	}

	// Sloppiness
	const roughFieldset = container.createEl('fieldset')
	roughFieldset.createEl('legend', { text: 'Sloppiness' })
	const roughList = roughFieldset.createDiv({ cls: 'buttonList' })
	for (const { value, icon, title } of roughnesses) {
		const label = roughList.createEl('label', { attr: { title } })
		label.createEl('input', { type: 'radio', attr: { name: 'annotation-roughness' } })
		label.appendChild(icon())
		if (state.style.roughness === value) {
			label.addClass('active')
		}
		label.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			callbacks.updateStyle({ roughness: value })
		})
	}

	// Edges
	const edgeFieldset = container.createEl('fieldset')
	edgeFieldset.createEl('legend', { text: 'Edges' })
	const edgeList = edgeFieldset.createDiv({ cls: 'buttonList' })
	for (const { value, icon, title } of edges) {
		const label = edgeList.createEl('label', { attr: { title } })
		label.createEl('input', { type: 'radio', attr: { name: 'annotation-edge-style' } })
		label.appendChild(icon())
		if (state.style.edgeStyle === value) {
			label.addClass('active')
		}
		label.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			callbacks.updateStyle({ edgeStyle: value })
		})
	}

	const opacityLabel = container.createEl('label', { cls: 'control-label' })
	opacityLabel.createSpan({ text: 'Opacity' })
	const opacityRow = opacityLabel.createDiv({ cls: 'range-wrapper' })
	const opacityInput = opacityRow.createEl('input', {
		type: 'range',
		cls: 'range-input annotation-opacity-slider',
		attr: {
			min: '0',
			max: '100',
			step: '10',
			'data-testid': 'opacity',
			'aria-label': 'Opacity'
		}
	})
	opacityInput.value = String(state.style.opacity)
	const opacityValue = opacityRow.createDiv({
		cls: 'value-bubble annotation-opacity-value',
		text: state.style.opacity !== 0 ? String(state.style.opacity) : ''
	})
	opacityRow.createDiv({ cls: 'zero-label', text: '0' })

	const positionOpacityBubble = () => {
		const inputWidth = opacityInput.offsetWidth
		const thumbSize =
			parseFloat(
				getComputedStyle(opacityInput).getPropertyValue('--slider-thumb-size')
			) || 16
		const progress = state.style.opacity
		const pos = (progress / 100) * (inputWidth - thumbSize) + thumbSize / 2
		opacityValue.style.left = `${pos}px`
	}
	positionOpacityBubble()

	opacityInput.addEventListener('input', () => {
		const value = parseInt(opacityInput.value, 10)
		callbacks.updateOpacity(value)
		opacityValue.textContent = value !== 0 ? String(value) : ''
		const inputWidth = opacityInput.offsetWidth
		const thumbSize =
			parseFloat(
				getComputedStyle(opacityInput).getPropertyValue('--slider-thumb-size')
			) || 16
		const pos = (value / 100) * (inputWidth - thumbSize) + thumbSize / 2
		opacityValue.style.left = `${pos}px`
	})

	const layersFieldset = container.createEl('fieldset')
	layersFieldset.createEl('legend', { text: 'Layers' })
	const layersList = layersFieldset.createDiv({ cls: 'buttonList' })
	for (const item of layers) {
		const btn = layersList.createEl('button', {
			type: 'button',
			attr: { title: item.title, 'aria-label': item.title }
		})
		btn.appendChild(item.icon())
		btn.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			item.action()
		})
	}

	const actionsFieldset = container.createEl('fieldset')
	actionsFieldset.createEl('legend', { text: 'Actions' })
	const actionsList = actionsFieldset.createDiv({ cls: 'buttonList' })
	for (const item of actions) {
		const btn = actionsList.createEl('button', {
			type: 'button',
			attr: { title: item.title, 'aria-label': item.title }
		})
		btn.appendChild(item.icon())
		btn.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			item.action()
		})
	}
}

function renderColorRow(
	container: HTMLElement,
	colors: readonly string[],
	label: string,
	mode: 'stroke' | 'background',
	setColor: (color: string) => void,
	getColor: () => string
) {
	const pickerContainer = container.createDiv({ cls: 'color-picker-container' })
	const topPicks = pickerContainer.createDiv({ cls: 'color-picker__top-picks' })

	for (const color of colors) {
		const isTransparent = color === 'transparent'
		const btn = topPicks.createEl('button', {
			cls: 'color-picker__button',
			type: 'button',
			attr: { title: color, 'aria-label': `${label} ${color}` }
		})
		btn.style.setProperty('--swatch-color', color)
		if (isTransparent) {
			btn.addClass('is-transparent', 'has-outline')
		} else if (!isColorDark(color, COLOR_OUTLINE_CONTRAST_THRESHOLD)) {
			btn.addClass('has-outline')
		}
		btn.createDiv({ cls: 'color-picker__button-outline' })
		if (getColor() === color) {
			btn.addClass('active')
		}
		btn.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			setColor(color)
		})
	}

	// Vertical divider
	pickerContainer.createDiv({
		cls: 'color-picker-divider'
	})

	// Current color indicator button
	const currentBtn = pickerContainer.createEl('button', {
		cls: 'color-picker__button active-color',
		type: 'button',
		attr: { title: `Current ${label}`, 'aria-label': `${label} current` }
	})
	currentBtn.style.setProperty('--swatch-color', getColor())
	if (getColor() === 'transparent') {
		currentBtn.addClass('is-transparent', 'has-outline')
	} else if (!isColorDark(getColor(), COLOR_OUTLINE_CONTRAST_THRESHOLD)) {
		currentBtn.addClass('has-outline')
	}
	currentBtn.createDiv({ cls: 'color-picker__button-outline' })
}

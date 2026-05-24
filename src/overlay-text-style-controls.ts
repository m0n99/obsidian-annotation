import type { AnnotationStyle } from './drawing/types'
import {
	COLOR_OUTLINE_CONTRAST_THRESHOLD,
	DEFAULT_ELEMENT_STROKE_PICKS,
	FONT_FAMILY,
	FONT_SIZES,
	isColorDark
} from './drawing/excalidraw'
import {
	createBringForwardIcon,
	createBringToFrontIcon,
	createDuplicateIcon,
	createFontSizeExtraLargeIcon,
	createFontSizeLargeIcon,
	createFontSizeMediumIcon,
	createFontSizeSmallIcon,
	createFontFamilyCodeIcon,
	createFontFamilyHandDrawnIcon,
	createFontFamilyNormalIcon,
	createSendBackwardIcon,
	createSendToBackIcon,
	createStrokeIcon,
	createTextAlignCenterIcon,
	createTextAlignLeftIcon,
	createTextAlignRightIcon,
	createTrashIcon
} from './drawing/icons'
import type { OverlayLayerDirection } from './overlay-toolbar'

export type TextStyleControlsState = {
	style: Required<AnnotationStyle>
	textAlign: 'left' | 'center' | 'right'
	fontSize: number
	fontFamily: number
}

export type TextStyleControlsCallbacks = {
	updateStyle(style: Partial<Required<AnnotationStyle>>): void
	updateOpacity(opacity: number): void
	updateTextAlign(align: 'left' | 'center' | 'right'): void
	updateFontSize(size: number): void
	updateFontFamily(family: number): void
	duplicateSelected(): void
	deleteSelected(): void
	moveLayer(direction: OverlayLayerDirection): void
}

export function renderTextStyleControls(
	container: HTMLElement,
	state: TextStyleControlsState,
	callbacks: TextStyleControlsCallbacks
) {
	const strokeColors = DEFAULT_ELEMENT_STROKE_PICKS
	const fontFamilies: Array<{ value: number; icon: () => SVGSVGElement; title: string }> = [
		{ value: FONT_FAMILY.Excalifont, icon: createFontFamilyHandDrawnIcon, title: 'Hand-drawn' },
		{ value: FONT_FAMILY.Nunito, icon: createFontFamilyNormalIcon, title: 'Normal' },
		{ value: FONT_FAMILY.Cascadia, icon: createFontFamilyCodeIcon, title: 'Code' }
	]
	const fontSizes: Array<{ value: number; icon: () => SVGSVGElement; title: string }> = [
		{ value: FONT_SIZES.sm, icon: createFontSizeSmallIcon, title: 'Small' },
		{ value: FONT_SIZES.md, icon: createFontSizeMediumIcon, title: 'Medium' },
		{ value: FONT_SIZES.lg, icon: createFontSizeLargeIcon, title: 'Large' },
		{ value: FONT_SIZES.xl, icon: createFontSizeExtraLargeIcon, title: 'Very large' }
	]
	const textAligns: Array<{
		value: 'left' | 'center' | 'right'
		icon: () => SVGSVGElement
		title: string
	}> = [
		{ value: 'left', icon: createTextAlignLeftIcon, title: 'Left' },
		{ value: 'center', icon: createTextAlignCenterIcon, title: 'Center' },
		{ value: 'right', icon: createTextAlignRightIcon, title: 'Right' }
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

	// Stroke — text elements support stroke color (used as text color)
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

	// Font family
	const familyFieldset = container.createEl('fieldset')
	familyFieldset.createEl('legend', { text: 'Font family' })
	const familyList = familyFieldset.createDiv({ cls: 'buttonList' })
	for (const { value, icon, title } of fontFamilies) {
		const label = familyList.createEl('label', { attr: { title } })
		label.createEl('input', { type: 'radio', attr: { name: 'annotation-font-family' } })
		label.appendChild(icon())
		if (state.fontFamily === value) {
			label.addClass('active')
		}
		label.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			callbacks.updateFontFamily(value)
		})
	}

	// Font size
	const fontFieldset = container.createEl('fieldset')
	fontFieldset.createEl('legend', { text: 'Font size' })
	const fontList = fontFieldset.createDiv({ cls: 'buttonList' })
	for (const { value, icon, title } of fontSizes) {
		const label = fontList.createEl('label', { attr: { title } })
		label.createEl('input', { type: 'radio', attr: { name: 'annotation-font-size' } })
		label.appendChild(icon())
		if (state.fontSize === value) {
			label.addClass('active')
		}
		label.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			callbacks.updateFontSize(value)
		})
	}

	// Text align
	const alignFieldset = container.createEl('fieldset')
	alignFieldset.createEl('legend', { text: 'Text align' })
	const alignList = alignFieldset.createDiv({ cls: 'buttonList' })
	for (const { value, icon, title } of textAligns) {
		const label = alignList.createEl('label', { attr: { title } })
		label.createEl('input', { type: 'radio', attr: { name: 'annotation-text-align' } })
		label.appendChild(icon())
		if (state.textAlign === value) {
			label.addClass('active')
		}
		label.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			callbacks.updateTextAlign(value)
		})
	}

	// Opacity
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
		text: `${state.style.opacity}%`
	})
	opacityValue.style.setProperty('left', `${state.style.opacity}%`)
	opacityRow.createDiv({ cls: 'zero-label', text: '0' })
	opacityInput.addEventListener('input', () => {
		const value = parseInt(opacityInput.value, 10)
		callbacks.updateOpacity(value)
		opacityValue.textContent = `${value}%`
		opacityValue.style.setProperty('left', `${value}%`)
	})

	// Layers
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

	// Actions
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
	const outlineEl = currentBtn.createDiv({ cls: 'color-picker__button-outline' })
	if (mode === 'stroke' && getColor() !== 'transparent') {
		const background = currentBtn.createDiv({ cls: 'color-picker__button-background' })
		const iconColor = isColorDark(getColor(), COLOR_OUTLINE_CONTRAST_THRESHOLD)
			? '#fff'
			: '#111'
		const icon = createStrokeIcon()
		icon.style.color = iconColor
		background.appendChild(icon)
	} else if (getColor() === 'transparent') {
		outlineEl.setText('/')
	}
}

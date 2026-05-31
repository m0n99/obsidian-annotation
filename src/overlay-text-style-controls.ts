import type { AnnotationStyle } from './drawing/types'
import { TEXT_FONT_SIZES } from './drawing/types'
import {
	DEFAULT_ELEMENT_STROKE_PICKS,
	FONT_FAMILY
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
	createTextAlignCenterIcon,
	createTextAlignLeftIcon,
	createTextAlignRightIcon,
	createTrashIcon
} from './drawing/icons'
import {
	renderButtonListFieldset,
	renderColorRow,
	renderOpacitySlider
} from './overlay-shared-controls'
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
		{ value: TEXT_FONT_SIZES.sm, icon: createFontSizeSmallIcon, title: 'Small' },
		{ value: TEXT_FONT_SIZES.md, icon: createFontSizeMediumIcon, title: 'Medium' },
		{ value: TEXT_FONT_SIZES.lg, icon: createFontSizeLargeIcon, title: 'Large' },
		{ value: TEXT_FONT_SIZES.xl, icon: createFontSizeExtraLargeIcon, title: 'Very large' }
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
		(color: string) => {
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

	renderOpacitySlider(container, () => state.style.opacity, callbacks.updateOpacity)

	renderButtonListFieldset(container, 'Layers', layers)
	renderButtonListFieldset(container, 'Actions', actions)
}

import type { AnnotationStyle } from '../drawing/types'
import { TEXT_FONT_SIZES } from '../drawing/types'
import {
	DEFAULT_ELEMENT_BACKGROUND_PICKS,
	DEFAULT_ELEMENT_STROKE_PICKS,
	FONT_FAMILY,
	ROUGHNESS,
	STROKE_WIDTH
} from '../drawing/excalidraw'
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
	createTrashIcon,
	createGroupIcon,
	createUngroupIcon,
	createAlignLeftIcon,
	createAlignRightIcon,
	createAlignTopIcon,
	createAlignBottomIcon,
	createAlignCenterHIcon,
	createAlignCenterVIcon,
	createFontFamilyHandDrawnIcon,
	createFontFamilyNormalIcon,
	createFontFamilyCodeIcon,
	createFontSizeSmallIcon,
	createFontSizeMediumIcon,
	createFontSizeLargeIcon,
	createFontSizeExtraLargeIcon,
	createTextAlignLeftIcon,
	createTextAlignCenterIcon,
	createTextAlignRightIcon
} from '../drawing/icons'
import { renderButtonListFieldset, renderColorRow, renderOpacitySlider } from './shared-controls'
import type { OverlayLayerDirection } from './toolbar'

import type { Alignment } from '../drawing/align'

export type TextStyleInShapePanel = {
	fontSize: number
	fontFamily: number
	textAlign: 'left' | 'center' | 'right'
}

export type StyleControlsState = {
	style: Required<AnnotationStyle>
	hasSelection: boolean
	canGroup: boolean
	canUngroup: boolean
	canAlign: boolean
	textState?: TextStyleInShapePanel
}

export type StyleControlsCallbacks = {
	updateStyle(style: Partial<Required<AnnotationStyle>>): void
	updateOpacity(opacity: number): void
	duplicateSelected(): void
	deleteSelected(): void
	moveLayer(direction: OverlayLayerDirection): void
	groupSelected(): void
	ungroupSelected(): void
	alignSelected(alignment: Alignment): void
	updateFontSize?(size: number): void
	updateFontFamily?(family: number): void
	updateTextAlign?(align: 'left' | 'center' | 'right'): void
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
		(color: string) => {
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
		(color: string) => {
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

	// Text controls (font family, font size, text align) — inline when text in selection
	if (state.textState && callbacks.updateFontSize && callbacks.updateFontFamily && callbacks.updateTextAlign) {
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
		const textAligns: Array<{ value: 'left' | 'center' | 'right'; icon: () => SVGSVGElement; title: string }> = [
			{ value: 'left', icon: createTextAlignLeftIcon, title: 'Left' },
			{ value: 'center', icon: createTextAlignCenterIcon, title: 'Center' },
			{ value: 'right', icon: createTextAlignRightIcon, title: 'Right' }
		]

		// Font family
		const familyFieldset = container.createEl('fieldset')
		familyFieldset.createEl('legend', { text: 'Font family' })
		const familyList = familyFieldset.createDiv({ cls: 'buttonList' })
		for (const { value, icon, title } of fontFamilies) {
			const label = familyList.createEl('label', { attr: { title } })
			label.createEl('input', { type: 'radio', attr: { name: 'annotation-font-family' } })
			label.appendChild(icon())
			if (state.textState.fontFamily === value) {
				label.addClass('active')
			}
			label.addEventListener('click', (event) => {
				event.preventDefault()
				event.stopPropagation()
				callbacks.updateFontFamily!(value)
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
			if (state.textState.fontSize === value) {
				label.addClass('active')
			}
			label.addEventListener('click', (event) => {
				event.preventDefault()
				event.stopPropagation()
				callbacks.updateFontSize!(value)
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
			if (state.textState.textAlign === value) {
				label.addClass('active')
			}
			label.addEventListener('click', (event) => {
				event.preventDefault()
				event.stopPropagation()
				callbacks.updateTextAlign!(value)
			})
		}
	}

	renderOpacitySlider(container, () => state.style.opacity, callbacks.updateOpacity)

	renderButtonListFieldset(container, 'Layers', layers)

	// Align (only when 2+ elements/groups selected)
	// Two-row layout matching Excalidraw: row 1 = left/center-H/right, row 2 = top/center-V/bottom
	if (state.canAlign) {
		const alignFieldset = container.createEl('fieldset')
		alignFieldset.createEl('legend', { text: 'Align' })
		const alignWrapper = alignFieldset.createDiv({ cls: 'buttonList' })
		alignWrapper.style.gap = '0.5rem'

		// Row 1: horizontal alignment
		const hAligns: Array<{ icon: () => SVGSVGElement; title: string; action: () => void }> = [
			{ icon: createAlignLeftIcon, title: 'Align left', action: () => callbacks.alignSelected({ position: 'start', axis: 'x' }) },
			{ icon: createAlignCenterHIcon, title: 'Align center H', action: () => callbacks.alignSelected({ position: 'center', axis: 'x' }) },
			{ icon: createAlignRightIcon, title: 'Align right', action: () => callbacks.alignSelected({ position: 'end', axis: 'x' }) }
		]
		for (const { icon, title, action } of hAligns) {
			const label = alignWrapper.createEl('label', { attr: { title } })
			label.createEl('input', { type: 'radio', attr: { name: 'annotation-align' } })
			label.appendChild(icon())
			label.addEventListener('click', (event) => {
				event.preventDefault()
				event.stopPropagation()
				action()
			})
		}

		// Row break
		alignWrapper.createDiv({ attr: { style: 'flex-basis:100%;height:0' } })

		// Row 2: vertical alignment
		const vAligns: Array<{ icon: () => SVGSVGElement; title: string; action: () => void }> = [
			{ icon: createAlignTopIcon, title: 'Align top', action: () => callbacks.alignSelected({ position: 'start', axis: 'y' }) },
			{ icon: createAlignCenterVIcon, title: 'Align center V', action: () => callbacks.alignSelected({ position: 'center', axis: 'y' }) },
			{ icon: createAlignBottomIcon, title: 'Align bottom', action: () => callbacks.alignSelected({ position: 'end', axis: 'y' }) }
		]
		for (const { icon, title, action } of vAligns) {
			const label = alignWrapper.createEl('label', { attr: { title } })
			label.createEl('input', { type: 'radio', attr: { name: 'annotation-align' } })
			label.appendChild(icon())
			label.addEventListener('click', (event) => {
				event.preventDefault()
				event.stopPropagation()
				action()
			})
		}
	}

	// Actions: duplicate, delete, group, ungroup (matches Excalidraw order)
	if (state.hasSelection) {
		const allActions: Array<{ icon: () => SVGSVGElement; title: string; action: () => void; hidden?: boolean }> = [
			{
				icon: createDuplicateIcon,
				title: 'Duplicate',
				action: () => callbacks.duplicateSelected()
			},
			{
				icon: createTrashIcon,
				title: 'Delete',
				action: () => callbacks.deleteSelected()
			},
			{
				icon: createGroupIcon,
				title: 'Group (Ctrl+G)',
				action: () => callbacks.groupSelected(),
				hidden: !state.canGroup
			},
			{
				icon: createUngroupIcon,
				title: 'Ungroup (Ctrl+Shift+G)',
				action: () => callbacks.ungroupSelected(),
				hidden: !state.canUngroup
			}
		]
		renderButtonListFieldset(container, 'Actions', allActions)
	}
}

import type { AnnotationTool } from '../drawing/types'
import {
	createArrowIcon,
	createDiamondIcon,
	createEllipseIcon,
	createEraserIcon,
	createFreedrawIcon,
	createImageIcon,
	createLineIcon,
	createRectangleIcon,
	createSelectionIcon,
	createTextIcon
} from '../drawing/icons'
import { renderStyleControls } from './style-controls'
import {
	renderTextStyleControls,
	type TextStyleControlsState,
	type TextStyleControlsCallbacks
} from './text-style-controls'

export type OverlayLayerDirection = 'front' | 'forward' | 'backward' | 'back'

type OverlayToolbarState = {
	tool: AnnotationTool
	hasSelection: boolean
	isTextSelection: boolean
	textStyle?: TextStyleControlsState
	stylePanelOpen?: boolean
}

type OverlayToolbarCallbacks = {
	selectTool(tool: AnnotationTool): void
	toggleStylePanel(): void
}

type ShapeStyleState = Parameters<typeof renderStyleControls>[1]
type ShapeStyleCallbacks = Parameters<typeof renderStyleControls>[2]

type TextCallbacks = TextStyleControlsCallbacks

export function renderOverlayToolbar(
	toolbarEl: HTMLElement,
	toggleEl: HTMLElement,
	stylePanelEl: HTMLElement,
	state: OverlayToolbarState & ShapeStyleState,
	callbacks: OverlayToolbarCallbacks & ShapeStyleCallbacks & Partial<TextCallbacks>
) {
	toolbarEl.empty()

	// Toolbar tools in Excalidraw order:
	// selection, rectangle, diamond, ellipse, arrow, line, freedraw, text, image, eraser
	const tools: Array<{
		id: AnnotationTool
		icon: (size?: 'default' | 'modified') => SVGSVGElement
		title: string
		key: string
		fillable: boolean
	}> = [
		{
			id: 'select',
			icon: createSelectionIcon,
			title: 'Select — V or 1',
			key: '1',
			fillable: true
		},
		{
			id: 'rectangle',
			icon: createRectangleIcon,
			title: 'Rectangle — R or 2',
			key: '2',
			fillable: true
		},
		{
			id: 'diamond',
			icon: createDiamondIcon,
			title: 'Diamond — D or 3',
			key: '3',
			fillable: true
		},
		{
			id: 'ellipse',
			icon: createEllipseIcon,
			title: 'Ellipse — O or 4',
			key: '4',
			fillable: true
		},
		{ id: 'arrow', icon: createArrowIcon, title: 'Arrow — A or 5', key: '5', fillable: true },
		{ id: 'line', icon: createLineIcon, title: 'Line — L or 6', key: '6', fillable: true },
		{ id: 'pen', icon: createFreedrawIcon, title: 'Draw — P or 7', key: '7', fillable: false },
		{ id: 'text', icon: createTextIcon, title: 'Text — T or 8', key: '8', fillable: false },
		{ id: 'image', icon: createImageIcon, title: 'Image — 9', key: '9', fillable: false },
		{
			id: 'eraser',
			icon: createEraserIcon,
			title: 'Eraser — E or 0',
			key: '0',
			fillable: false
		}
	]

	const rowEl = toolbarEl.createDiv({ cls: 'annotation-toolbar-row' })

	for (const item of tools) {
		const label = rowEl.createEl('label', {
			cls: 'ToolIcon' + (item.fillable ? ' fillable' : ''),
			attr: { title: item.title }
		})

		const radio = label.createEl('input', {
			cls: 'ToolIcon_type_radio ToolIcon_size_medium',
			type: 'radio',
			attr: {
				name: 'annotation-editor-current-shape',
				'aria-label': item.title.split(' — ')[0] ?? item.title
			}
		})
		radio.checked = state.tool === item.id

		const iconWrapper = label.createDiv({ cls: 'ToolIcon__icon' })
		iconWrapper.appendChild(item.icon())
		label.createSpan({ cls: 'ToolIcon__keybinding', text: item.key })

		label.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			callbacks.selectTool(item.id)
		})
	}

	// Toggle button (separate element from the dropdown panel)
	toggleEl.empty()
	const isDrawingTool =
		state.tool !== 'select' && state.tool !== 'eraser' && state.tool !== 'image'
	const showToggle = state.hasSelection || isDrawingTool
	toggleEl.toggleClass('has-selection', state.hasSelection)
	toggleEl.toggleClass('show-toggle', showToggle)

	if (!showToggle) {
		stylePanelEl.empty()
		stylePanelEl.toggleClass('is-open', false)
		return
	}

	const isOpen = !!state.stylePanelOpen
	const toggleBtn = toggleEl.createEl('button', {
		cls: `ToolIcon ToolIcon_size_medium ToolIcon_type_button${isOpen ? ' is-active' : ''}`,
		type: 'button',
		attr: {
			title: isOpen ? 'Hide style controls' : 'Show style controls',
			'aria-label': isOpen ? 'Hide style controls' : 'Show style controls'
		}
	})
	const toggleIconEl = toggleBtn.createDiv({
		cls: 'ToolIcon__icon',
		attr: { 'aria-hidden': 'true', 'aria-disabled': 'false' }
	})
	toggleIconEl.appendChild(createPaletteIcon())
	toggleBtn.addEventListener('click', (event) => {
		event.preventDefault()
		event.stopPropagation()
		callbacks.toggleStylePanel()
	})

	// Style panel (dropdown content)
	stylePanelEl.empty()
	stylePanelEl.toggleClass('is-open', isOpen)
	if (!isOpen) {
		return
	}

	const styleEl = stylePanelEl.createDiv({ cls: 'annotation-style-controls' })

	if (
		state.isTextSelection &&
		state.textStyle &&
		callbacks.updateTextAlign &&
		callbacks.updateFontSize
	) {
		renderTextStyleControls(styleEl, state.textStyle, callbacks as TextCallbacks)
	} else {
		renderStyleControls(styleEl, state, callbacks)
	}
}

function createPaletteIcon(): SVGSVGElement {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	svg.setAttribute('aria-hidden', 'true')
	svg.setAttribute('focusable', 'false')
	svg.setAttribute('role', 'img')
	svg.setAttribute('viewBox', '0 0 512 512')
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	path.setAttribute('fill', 'var(--icon-fill-color)')
	path.setAttribute(
		'd',
		'M204.3 5C104.9 24.4 24.8 104.3 5.2 203.4c-37 187 131.7 326.4 258.8 306.7 41.2-6.4 61.4-54.6 42.5-91.7-23.1-45.4 9.9-98.4 60.9-98.4h79.7c35.8 0 64.8-29.6 64.9-65.3C511.5 97.1 368.1-26.9 204.3 5zM96 320c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm32-128c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm128-64c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm128 64c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z'
	)
	svg.appendChild(path)
	return svg
}

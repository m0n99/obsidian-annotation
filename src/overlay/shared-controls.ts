import { COLOR_OUTLINE_CONTRAST_THRESHOLD, isColorDark } from '../drawing/excalidraw'

export function renderColorRow(
	container: HTMLElement,
	colors: readonly string[],
	label: string,
	_setColor: (color: string) => void,
	_getColor: () => string
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
		if (_getColor() === color) {
			btn.addClass('active')
		}
		btn.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			_setColor(color)
		})
	}

	// Vertical divider
	pickerContainer.createDiv({ cls: 'color-picker-divider' })

	// Current color indicator button
	const currentBtn = pickerContainer.createEl('button', {
		cls: 'color-picker__button active-color',
		type: 'button',
		attr: { title: `Current ${label}`, 'aria-label': `${label} current` }
	})
	currentBtn.style.setProperty('--swatch-color', _getColor())
	if (_getColor() === 'transparent') {
		currentBtn.addClass('is-transparent', 'has-outline')
	} else if (!isColorDark(_getColor(), COLOR_OUTLINE_CONTRAST_THRESHOLD)) {
		currentBtn.addClass('has-outline')
	}
	currentBtn.createDiv({ cls: 'color-picker__button-outline' })
}

export function renderOpacitySlider(
	container: HTMLElement,
	getOpacity: () => number,
	updateOpacity: (value: number) => void
) {
	const opacity = getOpacity()
	const label = container.createEl('label', { cls: 'control-label' })
	label.createSpan({ text: 'Opacity' })
	const row = label.createDiv({ cls: 'range-wrapper' })
	const input = row.createEl('input', {
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
	input.value = String(opacity)
	const bubble = row.createDiv({
		cls: 'value-bubble annotation-opacity-value',
		text: opacity !== 0 ? String(opacity) : ''
	})
	row.createDiv({ cls: 'zero-label', text: '0' })

	const positionBubble = (value: number) => {
		const inputWidth = input.offsetWidth
		const thumbSize =
			parseFloat(getComputedStyle(input).getPropertyValue('--slider-thumb-size')) || 16
		const pos = (value / 100) * (inputWidth - thumbSize) + thumbSize / 2
		bubble.style.left = `${pos}px`
	}
	positionBubble(opacity)

	input.addEventListener('input', () => {
		const value = parseInt(input.value, 10)
		updateOpacity(value)
		bubble.textContent = value !== 0 ? String(value) : ''
		positionBubble(value)
	})
}

export function renderButtonListFieldset(
	container: HTMLElement,
	legend: string,
	items: ReadonlyArray<{
		icon: () => SVGSVGElement
		title: string
		action: () => void
		hidden?: boolean
	}>
) {
	const fieldset = container.createEl('fieldset')
	fieldset.createEl('legend', { text: legend })
	const list = fieldset.createDiv({ cls: 'buttonList' })
	for (const item of items) {
		if (item.hidden) continue
		const btn = list.createEl('button', {
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

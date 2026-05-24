import {
	SVG_NS,
	SHIFT_LOCKING_ANGLE,
	DEFAULT_FONT_SIZE,
	FONT_FAMILY,
	MIN_FONT_SIZE,
	DEFAULT_ELEMENT_PROPS,
	getFontFamilyString,
	getLineHeight
} from './excalidraw'

export { SVG_NS, SHIFT_LOCKING_ANGLE }

/** Default font size for text annotations (re-exported from Excalidraw as DEFAULT_FONT_SIZE). */
export const TEXT_DEFAULT_FONT_SIZE = DEFAULT_FONT_SIZE

export const MIN_SHAPE_SIZE = 4
export const SELECTION_HANDLE_SIZE = 8
/** Minimum font size for Annotation text (Excalidraw's MIN_FONT_SIZE is 1; we use a larger minimum). */
export const TEXT_MIN_FONT_SIZE = 8
export const TEXT_MIN_BOX_WIDTH = 24
export const DEFAULT_STROKE_COLOR = DEFAULT_ELEMENT_PROPS.strokeColor
export const DEFAULT_BACKGROUND_COLOR = DEFAULT_ELEMENT_PROPS.backgroundColor
export const DEFAULT_STROKE_WIDTH = DEFAULT_ELEMENT_PROPS.strokeWidth
export const DEFAULT_ROUGHNESS = DEFAULT_ELEMENT_PROPS.roughness
export const DEFAULT_OPACITY = DEFAULT_ELEMENT_PROPS.opacity
export const EXCALIDRAW_FONT_FAMILY = getFontFamilyString({ fontFamily: FONT_FAMILY.Virgil })
export const EXCALIDRAW_TEXT_LINE_HEIGHT = getLineHeight(FONT_FAMILY.Virgil)
export const EXCALIDRAW_FONT_FAMILY_ID = FONT_FAMILY.Virgil

export type AnnotationTool =
	| 'select'
	| 'pen'
	| 'rectangle'
	| 'diamond'
	| 'ellipse'
	| 'arrow'
	| 'line'
	| 'text'
	| 'image'
	| 'eraser'

export type AnnotationPoint = {
	x: number
	y: number
	pressure?: number
}

export type AnnotationStyle = {
	strokeColor?: string
	backgroundColor?: string
	fillStyle?: 'hachure' | 'cross-hatch' | 'solid' | 'zigzag'
	strokeWidth?: number
	strokeStyle?: 'solid' | 'dashed' | 'dotted'
	roughness?: number
	edgeStyle?: 'sharp' | 'round'
	opacity?: number
}

export type BaseAnnotationElement = {
	id: string
	type: string
	x: number
	y: number
	width: number
	height: number
	angle: number
	strokeColor?: string
	backgroundColor?: string
	fillStyle?: 'hachure' | 'cross-hatch' | 'solid' | 'zigzag'
	strokeWidth?: number
	strokeStyle?: 'solid' | 'dashed' | 'dotted'
	roundness?: null | { type: number; value?: number }
	roughness?: number
	opacity?: number
	seed: number
	version: number
	versionNonce: number
	index: string | null
	isDeleted: boolean
	groupIds: readonly string[]
	frameId: string | null
	boundElements: readonly { id: string; type: 'arrow' | 'text' }[] | null
	updated: number
	link: string | null
	locked: boolean
	customData?: Record<string, unknown>
}

export type FreeDrawAnnotationElement = BaseAnnotationElement & {
	type: 'freedraw'
	points: Array<[number, number]>
	pressures: number[]
	simulatePressure?: boolean
}

export type BoxAnnotationElement = BaseAnnotationElement & {
	type: 'rectangle' | 'diamond' | 'ellipse'
}

export type LinearAnnotationElement = BaseAnnotationElement & {
	type: 'line' | 'arrow'
	points: Array<[number, number]>
	startBinding: null
	endBinding: null
	startArrowhead: null | 'arrow'
	endArrowhead: null | 'arrow'
	polygon?: boolean
	elbowed?: boolean
}

export type TextAnnotationElement = BaseAnnotationElement & {
	type: 'text'
	text: string
	fontSize?: number
	fontFamily?: number
	textAlign?: 'left' | 'center' | 'right'
	verticalAlign?: 'top' | 'middle'
	containerId?: string | null
	originalText?: string
	autoResize?: boolean
	lineHeight?: number
}

export type AnnotationElement =
	| FreeDrawAnnotationElement
	| BoxAnnotationElement
	| LinearAnnotationElement
	| TextAnnotationElement

export type SelectionHandle =
	| 'nw'
	| 'ne'
	| 'se'
	| 'sw'
	| 'n'
	| 's'
	| 'w'
	| 'e'
	| 'rotation'
	| 'start'
	| 'end'

export type AnnotationScene = {
	elements: AnnotationElement[]
	origin?: 'left' | 'center'
}

export type ElementBounds = {
	x: number
	y: number
	width: number
	height: number
}

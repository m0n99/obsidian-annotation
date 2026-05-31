import type { MarkdownView, TFile } from 'obsidian'
import type { AnnotationScene } from '../drawing/types'
import type { AnnotationData } from '../persistence'
import { normalizeScene } from '../drawing/scene'
import { getEditorSizerCenterX } from '../editor-dom'
import { SCENE_COORDINATE_SPACE, SCENE_SAVE_DELAY_MS } from './utils'

export interface SaveHost {
	loadAnnotationData(file: TFile): Promise<AnnotationData>
	saveAnnotationData(file: TFile, data: AnnotationData): Promise<void>
}

export function scheduleSave(
	currentTimer: number | null,
	onSave: () => void
): number {
	if (currentTimer !== null) {
		window.clearTimeout(currentTimer)
	}

	return window.setTimeout(() => {
		onSave()
	}, SCENE_SAVE_DELAY_MS) as unknown as number
}

export function flushSave(
	currentTimer: number | null,
	onSave: () => void
): number | null {
	if (currentTimer === null) {
		return null
	}

	window.clearTimeout(currentTimer)
	onSave()
	return null
}

export async function saveScene(
	host: SaveHost,
	file: TFile,
	scene: AnnotationScene,
	view: MarkdownView,
	svgEl: SVGSVGElement
): Promise<void> {
	const persisted = toPersistedScene(normalizeScene(scene), view, svgEl)
	const hasElements = persisted.elements.length > 0
	await host.saveAnnotationData(file, {
		coordinateSpace: SCENE_COORDINATE_SPACE,
		...(hasElements ? { scene: persisted } : {})
	})
}

export async function loadScene(
	host: SaveHost,
	file: TFile,
	loadVersion: number,
	checkAlive: () => boolean,
	view: MarkdownView,
	svgEl: SVGSVGElement
): Promise<AnnotationScene | null> {
	const data = await host.loadAnnotationData(file)
	if (!checkAlive()) {
		return null
	}

	const sceneData =
		!data.coordinateSpace || data.coordinateSpace === SCENE_COORDINATE_SPACE
			? data.scene
			: undefined
	const scene = normalizeScene(sceneData)
	return scene.origin === 'center' ? fromPersistedScene(scene, view, svgEl) : scene
}

export function toPersistedScene(
	scene: AnnotationScene,
	view: MarkdownView,
	svgEl: SVGSVGElement
): AnnotationScene {
	return scene.origin === 'center'
		? translateSceneX(scene, getEditorSizerCenterX(view, svgEl), 'left')
		: { ...scene, origin: 'left' }
}

export function fromPersistedScene(
	scene: AnnotationScene,
	view: MarkdownView,
	svgEl: SVGSVGElement
): AnnotationScene {
	return translateSceneX(scene, getEditorSizerCenterX(view, svgEl), 'left')
}

export function translateSceneX(
	scene: AnnotationScene,
	dx: number,
	origin: AnnotationScene['origin']
): AnnotationScene {
	return {
		...scene,
		origin,
		elements: scene.elements.map((element) => ({
			...element,
			x: element.x + dx
		}))
	}
}

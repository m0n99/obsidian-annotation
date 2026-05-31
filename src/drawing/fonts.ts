import type { App, Plugin } from 'obsidian'

type PluginFontHost = {
	readonly app: App
	readonly manifest: Pick<Plugin['manifest'], 'dir'>
}

const EXCALIDRAW_FONT_ASSETS = [
	{
		family: 'Virgil',
		file: 'fonts/Virgil-Regular.woff2'
	},
	{
		family: 'Excalifont',
		file: 'fonts/Excalifont-Regular-a88b72a24fb54c9f94e3b5fdaa7481c9.woff2'
	},
	{
		family: 'Excalifont',
		file: 'fonts/Excalifont-Regular-be310b9bcd4f1a43f571c46df7809174.woff2'
	},
	{
		family: 'Excalifont',
		file: 'fonts/Excalifont-Regular-b9dcf9d2e50a1eaf42fc664b50a3fd0d.woff2'
	},
	{
		family: 'Excalifont',
		file: 'fonts/Excalifont-Regular-41b173a47b57366892116a575a43e2b6.woff2'
	},
	{
		family: 'Excalifont',
		file: 'fonts/Excalifont-Regular-3f2c5db56cc93c5a6873b1361d730c16.woff2'
	},
	{
		family: 'Excalifont',
		file: 'fonts/Excalifont-Regular-349fac6ca4700ffec595a7150a0d1e1d.woff2'
	},
	{
		family: 'Excalifont',
		file: 'fonts/Excalifont-Regular-623ccf21b21ef6b3a0d87738f77eb071.woff2'
	},
	{
		family: 'Nunito',
		file: 'fonts/Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTQ3j6zbXWjgeg.woff2'
	},
	{
		family: 'Nunito',
		file: 'fonts/Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTo3j6zbXWjgevT5.woff2'
	},
	{
		family: 'Nunito',
		file: 'fonts/Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTs3j6zbXWjgevT5.woff2'
	},
	{
		family: 'Nunito',
		file: 'fonts/Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTk3j6zbXWjgevT5.woff2'
	},
	{
		family: 'Nunito',
		file: 'fonts/Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTA3j6zbXWjgevT5.woff2'
	}
] as const

let preloadPromise: Promise<void> | null = null

export function preloadExcalidrawFonts(plugin: PluginFontHost) {
	preloadPromise ??= loadExcalidrawFonts(plugin).catch((error) => {
		console.warn('[annotation] Failed to preload Excalidraw fonts', error)
	})
	return preloadPromise
}

async function loadExcalidrawFonts(plugin: PluginFontHost) {
	if (typeof FontFace === 'undefined' || !document.fonts) {
		return
	}

	await Promise.all(
		EXCALIDRAW_FONT_ASSETS.map(async ({ family, file }) => {
			const url = plugin.app.vault.adapter.getResourcePath(`${plugin.manifest.dir}/${file}`)
			const font = new FontFace(family, `url(${url}) format("woff2")`, {
				style: 'normal',
				weight: '400',
				display: 'swap'
			})
			;(document.fonts as FontFaceSet & { add(font: FontFace): void }).add(font)
			await font.load()
		})
	)
}

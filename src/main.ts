import { MarkdownView, Notice, Plugin, TFile } from 'obsidian'
import { ANNOTATION_DRAWING_CLASS, AnnotationEditorOverlay } from './overlay'
import {
	ANNOTATION_STORAGE_DIR,
	annotationStoragePath,
	type AnnotationData,
	generateAnnotationId,
	parseAnnotationData,
	serializeAnnotationData
} from './persistence'

const ANNOTATION_FRONTMATTER_KEY = 'annotation'
const ANNOTATION_ACTIVE_VIEW_CLASS = 'annotation-active-markdown-view'

type AnnotationFrontmatter = Record<string, unknown>

interface MarkdownViewWithActions extends MarkdownView {
	addAction(icon: string, title: string, callback: (event: MouseEvent) => void): HTMLElement
}

export default class AnnotationPlugin extends Plugin {
	private readonly activeMarkdownEls = new Set<HTMLElement>()
	private readonly editorOverlays = new WeakMap<MarkdownView, AnnotationEditorOverlay>()
	private readonly editorOverlaysByContentEl = new WeakMap<HTMLElement, AnnotationEditorOverlay>()
	private readonly viewActionButtons = new WeakMap<MarkdownView, HTMLElement>()
	private readonly annotationIdsByPath = new Map<string, string>()
	private ribbonIconEl: HTMLElement | null = null
	private isDrawingMode = false

	async onload() {
		this.ribbonIconEl = this.addRibbonIcon(
			'square-pen',
			'Toggle Annotation for current note',
			() => {
				void this.toggleAnnotationForCurrentNote()
			}
		)

		this.addCommand({
			id: 'toggle-annotation-drawing-mode',
			name: 'Toggle Annotation drawing',
			callback: () => void this.toggleAnnotationForCurrentNote()
		})

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => this.updateMarkdownViewLayers())
		)
		this.registerEvent(
			this.app.workspace.on('file-open', () => this.updateMarkdownViewLayers())
		)
		this.registerEvent(
			this.app.workspace.on('layout-change', () => this.updateMarkdownViewLayers())
		)
		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				if (file.extension === 'md') {
					this.updateMarkdownViewLayers()
				}
			})
		)

		this.updateMarkdownViewLayers()
	}

	onunload() {
		this.clearMarkdownViewLayers()
	}

	async loadAnnotationData(file: TFile): Promise<AnnotationData> {
		const id = this.getAnnotationId(file)
		if (!id) {
			return {}
		}

		try {
			const path = annotationStoragePath(id)
			if (!(await this.app.vault.adapter.exists(path))) {
				return {}
			}
			return parseAnnotationData(await this.app.vault.adapter.read(path))
		} catch {
			return {}
		}
	}

	async saveAnnotationData(file: TFile, data: AnnotationData) {
		const id = await this.ensureAnnotationId(file)
		if (!id) {
			return
		}

		try {
			await this.writeAnnotationData(id, data)
		} catch {
			// File may be temporarily unavailable; skip this save.
		}
	}

	getActiveAnnotationOverlay() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		return view ? (this.editorOverlays.get(view) ?? null) : null
	}

	private async toggleAnnotationForCurrentNote() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		const file = view?.file

		if (!file) {
			new Notice('Open a markdown note first.')
			return
		}

		const enabled = !!this.getAnnotationId(file)
		const newState = !enabled
		const annotationId = newState ? generateAnnotationId() : null

		await this.app.fileManager.processFrontMatter(
			file,
			(frontmatter: AnnotationFrontmatter) => {
				if (annotationId) {
					frontmatter[ANNOTATION_FRONTMATTER_KEY] = annotationId
				} else {
					delete frontmatter[ANNOTATION_FRONTMATTER_KEY]
				}
			}
		)

		if (annotationId) {
			this.annotationIdsByPath.set(file.path, annotationId)
			await this.writeAnnotationData(annotationId, {})
		} else {
			this.annotationIdsByPath.delete(file.path)
		}

		// Apply the expected state immediately without waiting for metadata cache
		if (view) {
			if (newState) {
				view.contentEl.addClass(ANNOTATION_ACTIVE_VIEW_CLASS)
				this.activeMarkdownEls.add(view.contentEl)
				this.ensureViewActionButton(view)
				this.ensureEditorOverlay(view).setDrawingMode(this.isDrawingMode)
			} else {
				this.deactivateMarkdownView(view)
			}
		}

		this.updateActionButtonStates()
		new Notice(
			newState ? 'Annotation enabled for this note.' : 'Annotation disabled for this note.'
		)
	}

	private toggleDrawingMode() {
		this.isDrawingMode = !this.isDrawingMode
		this.updateMarkdownViewLayers()
	}

	private updateMarkdownViewLayers() {
		const activeEls = new Set<HTMLElement>()

		this.app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
			if (!(leaf.view instanceof MarkdownView)) {
				return
			}

			const view = leaf.view
			const contentEl = view.contentEl
			const enabled = !!view.file && !!this.getAnnotationId(view.file)
			this.ensureViewActionButton(view)

			if (!enabled) {
				this.deactivateMarkdownView(view)
				return
			}

			contentEl.addClass(ANNOTATION_ACTIVE_VIEW_CLASS)
			activeEls.add(contentEl)
			this.activeMarkdownEls.add(contentEl)
			this.ensureEditorOverlay(view).setDrawingMode(this.isDrawingMode)
		})

		for (const contentEl of Array.from(this.activeMarkdownEls)) {
			if (!activeEls.has(contentEl)) {
				const staleLeaf = this.app.workspace
					.getLeavesOfType('markdown')
					.find(
						(leaf) =>
							leaf.view instanceof MarkdownView && leaf.view.contentEl === contentEl
					)
				const staleOverlay = this.editorOverlaysByContentEl.get(contentEl)
				if (staleLeaf?.view instanceof MarkdownView) {
					this.deactivateMarkdownView(staleLeaf.view)
				} else if (staleOverlay) {
					staleOverlay.destroy()
					contentEl.removeClass(ANNOTATION_ACTIVE_VIEW_CLASS)
					contentEl.removeClass(ANNOTATION_DRAWING_CLASS)
					this.activeMarkdownEls.delete(contentEl)
				} else {
					contentEl.removeClass(ANNOTATION_ACTIVE_VIEW_CLASS)
					contentEl.removeClass(ANNOTATION_DRAWING_CLASS)
					this.activeMarkdownEls.delete(contentEl)
				}
			}
		}

		this.updateActionButtonStates()
	}

	private deactivateMarkdownView(view: MarkdownView) {
		view.contentEl.removeClass(ANNOTATION_ACTIVE_VIEW_CLASS)
		view.contentEl.removeClass(ANNOTATION_DRAWING_CLASS)
		this.activeMarkdownEls.delete(view.contentEl)

		const overlay = this.editorOverlays.get(view)
		if (overlay) {
			overlay.destroy()
			this.editorOverlays.delete(view)
			this.editorOverlaysByContentEl.delete(view.contentEl)
		}
	}

	private clearMarkdownViewLayers() {
		for (const contentEl of this.activeMarkdownEls) {
			contentEl.removeClass(ANNOTATION_ACTIVE_VIEW_CLASS)
			contentEl.removeClass(ANNOTATION_DRAWING_CLASS)
		}

		this.app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				this.deactivateMarkdownView(leaf.view)
				this.removeViewActionButton(leaf.view)
			}
		})

		this.activeMarkdownEls.clear()
	}

	private removeViewActionButton(view: MarkdownView) {
		const button = this.viewActionButtons.get(view)
		if (button) {
			button.remove()
			this.viewActionButtons.delete(view)
		}
	}

	private ensureViewActionButton(view: MarkdownView) {
		const existing = this.viewActionButtons.get(view)
		if (existing?.isConnected) {
			return existing
		}

		const button = (view as MarkdownViewWithActions).addAction(
			'pen-tool',
			'Toggle Annotation drawing',
			() => {
				void this.toggleViewAction(view)
			}
		)
		button.addClass('annotation-view-action')
		this.viewActionButtons.set(view, button)
		this.updateActionButtonStates()
		return button
	}

	private async toggleViewAction(view: MarkdownView) {
		const file = view.file
		if (!file) {
			new Notice('Open a markdown note first.')
			return
		}

		if (!this.getAnnotationId(file)) {
			const id = await this.ensureAnnotationId(file)
			if (!id) {
				new Notice('Unable to enable annotation for this note.')
				return
			}

			await this.writeAnnotationData(id, {})
			view.contentEl.addClass(ANNOTATION_ACTIVE_VIEW_CLASS)
			this.activeMarkdownEls.add(view.contentEl)
			this.ensureEditorOverlay(view).setDrawingMode(true)
			this.isDrawingMode = true
			this.updateActionButtonStates()
			return
		}

		this.toggleDrawingMode()
	}

	private updateActionButtonStates() {
		this.ribbonIconEl?.toggleClass('is-active', this.isDrawingMode)

		this.app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
			if (!(leaf.view instanceof MarkdownView)) {
				return
			}

			const button = this.viewActionButtons.get(leaf.view)
			if (button) {
				button.toggleClass('is-active', this.isDrawingMode)
			}
		})
	}

	private ensureEditorOverlay(view: MarkdownView) {
		const existing = this.editorOverlays.get(view)
		if (existing?.rootEl.isConnected && existing.isForFile(view.file)) {
			return existing
		}

		if (existing) {
			existing.destroy()
			this.editorOverlays.delete(view)
			this.editorOverlaysByContentEl.delete(view.contentEl)
		}

		const overlay = new AnnotationEditorOverlay(this, view)
		this.editorOverlays.set(view, overlay)
		this.editorOverlaysByContentEl.set(view.contentEl, overlay)
		return overlay
	}

	private getAnnotationId(file: TFile) {
		const cachedId = this.annotationIdsByPath.get(file.path)
		if (cachedId) {
			return cachedId
		}

		const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter as
			| AnnotationFrontmatter
			| undefined
		const value = frontmatter?.[ANNOTATION_FRONTMATTER_KEY]

		if (typeof value !== 'string' || !value.trim()) {
			return null
		}

		const id = value.trim()
		this.annotationIdsByPath.set(file.path, id)
		return id
	}

	private async ensureAnnotationId(file: TFile) {
		const existingId = this.getAnnotationId(file)
		if (existingId) {
			return existingId
		}

		const id = generateAnnotationId()
		try {
			await this.app.fileManager.processFrontMatter(
				file,
				(frontmatter: AnnotationFrontmatter) => {
					frontmatter[ANNOTATION_FRONTMATTER_KEY] = id
				}
			)
			this.annotationIdsByPath.set(file.path, id)
			return id
		} catch {
			return null
		}
	}

	private async ensureAnnotationStorageDir() {
		if (!(await this.app.vault.adapter.exists(ANNOTATION_STORAGE_DIR))) {
			await this.app.vault.adapter.mkdir(ANNOTATION_STORAGE_DIR)
		}
	}

	private async writeAnnotationData(id: string, data: AnnotationData) {
		await this.ensureAnnotationStorageDir()
		await this.app.vault.adapter.write(annotationStoragePath(id), serializeAnnotationData(data))
	}
}

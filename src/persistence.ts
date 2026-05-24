import type { AnnotationScene } from './drawing/types'

export const ANNOTATION_STORAGE_DIR = '.annotation'

export type AnnotationData = {
	coordinateSpace?: string
	scene?: Partial<AnnotationScene>
}

export function annotationStoragePath(id: string) {
	return `${ANNOTATION_STORAGE_DIR}/${id}.json`
}

export function generateAnnotationId() {
	const bytes = new Uint8Array(16)
	crypto.getRandomValues(bytes)
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function parseAnnotationData(json: string): AnnotationData {
	try {
		const parsed: unknown = JSON.parse(json)
		return parsed && typeof parsed === 'object' ? (parsed as AnnotationData) : {}
	} catch {
		return {}
	}
}

export function serializeAnnotationData(data: AnnotationData) {
	return `${JSON.stringify(data, null, '\t')}\n`
}

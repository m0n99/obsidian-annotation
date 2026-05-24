import { describe, expect, test } from 'bun:test'

import { parseVersion } from './update-version'

describe('parseVersion', () => {
	test('accepts semantic versions with or without a v prefix', () => {
		expect(parseVersion('1.2.3')).toBe('1.2.3')
		expect(parseVersion('v1.2.3')).toBe('1.2.3')
	})

	test('rejects invalid versions', () => {
		expect(() => parseVersion('1.2')).toThrow()
		expect(() => parseVersion('latest')).toThrow()
	})
})

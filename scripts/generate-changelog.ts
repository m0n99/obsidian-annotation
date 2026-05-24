import { $ } from 'bun'

const CHANGELOG_HEADER = `# Changelog

All notable changes to this project will be documented in this file.

`

export async function generateChangelog(): Promise<string> {
	const changelogFile = Bun.file('CHANGELOG.md')
	let existingContent = ''

	if (await changelogFile.exists()) {
		const content = await changelogFile.text()
		const match = content.match(/^(## \[?\d)/m)
		if (match?.index !== undefined) {
			existingContent = content.substring(match.index)
		} else if (!content.startsWith('#')) {
			existingContent = content
		}
	}

	const newEntry = await $`bunx conventional-changelog -p conventionalcommits -r 1`.text()
	const finalContent =
		CHANGELOG_HEADER +
		newEntry.trim() +
		(existingContent ? '\n\n' + existingContent : '') +
		'\n'
	await Bun.write('CHANGELOG.md', finalContent)
	return newEntry
}

if (import.meta.main) {
	console.log('Generating changelog...')
	await generateChangelog()
	console.log('Changelog updated successfully.')
}

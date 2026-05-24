const VERSION_REGEX = /^v?(\d+\.\d+\.\d+)$/

export function parseVersion(input: string): string {
	const match = input.match(VERSION_REGEX)
	if (!match?.[1]) {
		throw new Error(`Invalid version format: "${input}". Expected format: x.y.z or vx.y.z`)
	}
	return match[1]
}

export async function updatePackageVersion(version: string): Promise<void> {
	const packageFile = Bun.file('package.json')
	const packageJson = await packageFile.json()
	packageJson.version = version
	await Bun.write(packageFile, JSON.stringify(packageJson, null, '\t') + '\n')
	console.log(`Updated package.json version to ${version}`)
}

if (import.meta.main) {
	const version = process.argv[2]
	if (!version) {
		console.error('Usage: bun scripts/update-version.ts <version>')
		process.exit(1)
	}

	await updatePackageVersion(parseVersion(version))
}

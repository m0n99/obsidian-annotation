export interface ManifestJson {
	id: string
	name: string
	version: string
	minAppVersion: string
	[key: string]: unknown
}

export interface VersionsJson {
	[version: string]: string
}

export async function readManifest(): Promise<ManifestJson> {
	return (await Bun.file('manifest.json').json()) as ManifestJson
}

export async function writeManifest(manifest: ManifestJson): Promise<void> {
	await Bun.write('manifest.json', JSON.stringify(manifest, null, '\t') + '\n')
}

export async function readVersions(): Promise<VersionsJson> {
	return (await Bun.file('versions.json').json()) as VersionsJson
}

export async function writeVersions(versions: VersionsJson): Promise<void> {
	await Bun.write('versions.json', JSON.stringify(versions, null, '\t') + '\n')
}

export async function bumpVersion(targetVersion: string): Promise<void> {
	const manifest = await readManifest()
	manifest.version = targetVersion
	await writeManifest(manifest)
	console.log(`Updated manifest.json version to ${targetVersion}`)

	const versions = await readVersions()
	versions[targetVersion] = manifest.minAppVersion
	await writeVersions(versions)
	console.log(`Updated versions.json with ${targetVersion} -> ${manifest.minAppVersion}`)
}

if (import.meta.main) {
	const targetVersion = Bun.env['npm_package_version']
	if (!targetVersion) {
		console.error('Error: npm_package_version environment variable is not set.')
		process.exit(1)
	}

	await bumpVersion(targetVersion)
}

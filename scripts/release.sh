#!/bin/bash
set -e

if [ -n "$(git status --porcelain)" ]; then
	echo "Error: Git working directory is not clean."
	exit 1
fi

read -p "Version to release (SemVer without v prefix): " VERSION
VERSION="${VERSION#v}"

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "Error: Invalid version format. Use SemVer, e.g. 1.0.0"
	exit 1
fi

MANIFEST_VERSION="$(bun -e 'const m = await Bun.file("manifest.json").json(); console.log(m.version)')"
PACKAGE_VERSION="$(bun -e 'const p = await Bun.file("package.json").json(); console.log(p.version)')"
VERSIONS_ENTRY="$(bun -e 'const version = process.argv[1]; const versions = await Bun.file("versions.json").json(); console.log(versions[version] ?? "")' "$VERSION")"

if [ "$VERSION" != "$MANIFEST_VERSION" ]; then
	echo "Error: version ($VERSION) must match manifest.json version ($MANIFEST_VERSION)."
	exit 1
fi

if [ "$VERSION" != "$PACKAGE_VERSION" ]; then
	echo "Error: version ($VERSION) must match package.json version ($PACKAGE_VERSION)."
	exit 1
fi

if [ -z "$VERSIONS_ENTRY" ]; then
	echo "Error: versions.json is missing an entry for $VERSION."
	exit 1
fi

if git rev-parse "$VERSION" >/dev/null 2>&1; then
	echo "Error: tag $VERSION already exists locally."
	exit 1
fi

git push origin HEAD:main
git tag -a "$VERSION" -m "$VERSION"
git push origin "$VERSION"

echo "Release tag $VERSION pushed. GitHub Actions will create a draft release."

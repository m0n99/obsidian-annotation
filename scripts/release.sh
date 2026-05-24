#!/bin/bash
set -e

if ! command -v gh &> /dev/null; then
	echo "Error: GitHub CLI (gh) is not installed."
	exit 1
fi

if ! gh auth status &> /dev/null; then
	echo "Error: Not authenticated with GitHub CLI. Run: gh auth login"
	exit 1
fi

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

gh workflow run release.yml -f version="$VERSION"
echo "Release workflow triggered for $VERSION."

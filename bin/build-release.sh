#!/usr/bin/env bash
# Build a WordPress.org-ready release zip: build/vpress-<VERSION>.zip
#
# Usage: bin/build-release.sh   (from anywhere; paths resolve from the repo root)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(sed -n -E 's/^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*([^[:space:]]+).*/\1/p' vpress.php | head -n 1)"
if [[ -z "$VERSION" ]]; then
	echo "build-release: could not read Version from the vpress.php header" >&2
	exit 1
fi

BUILD_DIR="$ROOT/build"
STAGE="$BUILD_DIR/vpress"
ZIP="$BUILD_DIR/vpress-$VERSION.zip"

if [[ ! -d admin/node_modules ]]; then
	yarn --cwd admin install --frozen-lockfile
fi
yarn --cwd admin build

rm -rf "$STAGE" "$ZIP"
mkdir -p "$STAGE"

rsync -a --delete \
	--exclude='/.git' \
	--exclude='/.gitignore' \
	--exclude='/.gitlab-ci.yml' \
	--exclude='/.worktrees' \
	--exclude='/.superpowers' \
	--exclude='/.claude' \
	--exclude='/bin' \
	--exclude='/build' \
	--exclude='/docs' \
	--exclude='/openspec' \
	--exclude='/scripts' \
	--exclude='/tests' \
	--exclude='/_mock' \
	--exclude='/blocks/**/tests' \
	--exclude='/vendor' \
	--exclude='/CHANGELOG.md' \
	--exclude='/admin/node_modules' \
	--exclude='/admin/src' \
	--exclude='/admin/tests' \
	--exclude='/admin/playwright-report' \
	--exclude='/admin/test-results' \
	--exclude='/admin/index.html' \
	--exclude='/admin/vite.config.js' \
	--exclude='/admin/package.json' \
	--exclude='/admin/yarn.lock' \
	--exclude='/admin/eslint.config.*' \
	--exclude='/admin/.env*' \
	--exclude='/admin/.editorconfig' \
	--exclude='/admin/.gitignore' \
	--exclude='.DS_Store' \
	"$ROOT/" "$STAGE/"

(cd "$BUILD_DIR" && zip -rqX "$(basename "$ZIP")" vpress)

# Post-build assertion: required files present, dev-only paths absent.
LISTING="$(unzip -Z1 "$ZIP")"
status=0
for required in \
	vpress/vpress.php \
	vpress/readme.txt \
	vpress/admin/dist/js/app.js \
	vpress/admin/dist/js/chunk-vendors.js \
	vpress/admin/dist/css/app.css \
	vpress/admin/dist/js/embed.js \
	vpress/admin/dist/css/embed.css \
	vpress/blocks/chart/render.php \
	vpress/blocks/chart/block.json \
	vpress/assets/vendor/leaflet/leaflet.css \
	vpress/api/ \
	vpress/includes/ \
	vpress/public/; do
	if ! grep -qxF "$required" <<<"$LISTING"; then
		echo "build-release: MISSING $required" >&2
		status=1
	fi
done
# playwright-report/ and test-results/ hold Playwright traces, and with
# trace: 'retain-on-failure' a trace archive carries the logged-in admin
# session cookie. rsync copies the working tree, not git, so .gitignore does
# not keep them out of the zip — only these excludes do.
for forbidden in 'admin/src' 'node_modules' 'tests' 'playwright-report' 'test-results'; do
	if grep -qE "(^|/)${forbidden}(/|$)" <<<"$LISTING"; then
		echo "build-release: FORBIDDEN path in zip: $forbidden" >&2
		grep -E "(^|/)${forbidden}(/|$)" <<<"$LISTING" | head -n 5 >&2
		status=1
	fi
done
if [[ $status -ne 0 ]]; then
	echo "build-release: assertion failed for $ZIP" >&2
	exit 1
fi

SIZE="$(du -h "$ZIP" | cut -f1)"
echo "build-release: OK $ZIP ($SIZE, $(wc -l <<<"$LISTING" | tr -d ' ') entries)"

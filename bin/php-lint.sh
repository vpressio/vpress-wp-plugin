#!/usr/bin/env bash
# Run WordPress Coding Standards (PHPCS) against the Vpress source tree.
# Installs PHPCS + WPCS locally (into bin/, gitignored) on first run, then
# reuses them. Report-only tonight: this script never invokes phpcbf and
# never rewrites source — it only reports. Same script for CI (lint:php)
# and a developer's own machine, so both see the same result.
#
# Usage: bin/php-lint.sh [phpcs options...]
#   bin/php-lint.sh                                   # human-readable summary
#   bin/php-lint.sh --report=full --report-file=phpcs.txt
#   bin/php-lint.sh --report=json --report-file=phpcs.json
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PHP_BIN="${PHP_BIN:-php}"
PHPCS_PHAR="$ROOT/bin/phpcs.phar"
PHPCBF_PHAR="$ROOT/bin/phpcbf.phar"
WPCS_DIR="$ROOT/bin/wpcs"
# squizlabs/PHP_CodeSniffer is archived and frozen at 3.7.2 (verified
# 2026-09-24: its GitHub "latest" release is still 3.7.2). WordPress-Coding-
# Standards' current default branch requires squizlabs/php_codesniffer
# ^3.13.6, which PHPCS development has since moved to publishing from the
# community fork PHPCSStandards/PHP_CodeSniffer. Its own "latest" tag is
# already 4.0.x, which is a breaking major version incompatible with this
# WPCS release (composer.json pins ^3.13.6, i.e. a 3.x line) — resolving
# "Referenced sniff ... does not exist" errors — so this pins the exact
# 3.13.6 tag that satisfies that constraint instead of following "latest".
PHPCS_RELEASE_BASE="https://github.com/PHPCSStandards/PHP_CodeSniffer/releases/download/3.13.6"

if [[ ! -f "$PHPCS_PHAR" ]]; then
	echo "php-lint: installing phpcs.phar" >&2
	curl -sL -o "$PHPCS_PHAR" "$PHPCS_RELEASE_BASE/phpcs.phar"
fi

if [[ ! -f "$PHPCBF_PHAR" ]]; then
	echo "php-lint: installing phpcbf.phar" >&2
	curl -sL -o "$PHPCBF_PHAR" "$PHPCS_RELEASE_BASE/phpcbf.phar"
fi

clone_if_missing() {
	local dir="$1"
	local url="$2"
	if [[ ! -d "$dir" ]]; then
		echo "php-lint: cloning $(basename "$dir")" >&2
		git clone --depth 1 "$url" "$dir"
	fi
}

clone_if_missing "$WPCS_DIR/WordPress-Coding-Standards" "https://github.com/WordPress/WordPress-Coding-Standards"
clone_if_missing "$WPCS_DIR/PHPCSUtils" "https://github.com/PHPCSStandards/PHPCSUtils"
clone_if_missing "$WPCS_DIR/PHPCSExtra" "https://github.com/PHPCSStandards/PHPCSExtra"

# Idempotent: always (re)point installed_paths at this checkout's copies, so
# the script works the same whether run in CI (fresh clone each time) or on
# a developer's machine (paths already correct, this is a no-op rewrite).
"$PHP_BIN" "$PHPCS_PHAR" --config-set installed_paths \
	"$WPCS_DIR/WordPress-Coding-Standards,$WPCS_DIR/PHPCSUtils,$WPCS_DIR/PHPCSExtra" \
	>/dev/null

if [[ $# -eq 0 ]]; then
	set -- --report=summary
fi

"$PHP_BIN" "$PHPCS_PHAR" --standard="$ROOT/phpcs.xml.dist" "$@"

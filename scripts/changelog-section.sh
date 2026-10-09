#!/bin/sh
# Print the body of CHANGELOG.md's "## <version>" section (fails if missing/empty).
set -e
v="${1#v}"
out=$(awk -v v="$v" '/^## /{p = ($2 == v)} p && !/^## /' "$(dirname "$0")/../CHANGELOG.md" | sed '/./,$!d')
[ -n "$out" ] || { echo "CHANGELOG.md has no section for $v" >&2; exit 1; }
printf '%s\n' "$out"

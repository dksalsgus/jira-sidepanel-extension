#!/usr/bin/env bash

set -euo pipefail

VERSION="$(node -p "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')).version")"
ZIP_FILE="please-be-done-v${VERSION}.zip"

echo "Building Please Be Done ${VERSION}..."
npm run build:prod

echo "Creating ${ZIP_FILE} from dist/..."
rm -f "${ZIP_FILE}"
(
  cd dist
  zip -qr "../${ZIP_FILE}" . -x "*.DS_Store" "__MACOSX/*"
)

if ! unzip -l "${ZIP_FILE}" | grep -q "manifest.json"; then
  echo "Package verification failed: manifest.json was not found at the zip root." >&2
  exit 1
fi

SIZE="$(du -h "${ZIP_FILE}" | cut -f1)"
echo "Created ${ZIP_FILE} (${SIZE})"

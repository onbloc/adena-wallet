#!/bin/sh
# Package the Firefox build as an XPI. This is the Firefox counterpart of
# scripts/build-qa.sh (which packages the Chrome build).
#
# Usage: sh scripts/build-firefox-xpi.sh <tag-name>
#   e.g. sh scripts/build-firefox-xpi.sh v1.21.2
#
# Outputs:
#   deploy-firefox/adena-extension-firefox-<tag-name>.xpi
#   deploy-firefox-latest/adena-extension-firefox-v<version>.xpi

tag_name=$1
if [ -z "$tag_name" ]; then
  echo "usage: sh scripts/build-firefox-xpi.sh <tag-name>" >&2
  exit 1
fi

version=$(awk -F'"' '/"version": ".+"/{ print $4; exit; }' package.json)
file_name=adena-extension-firefox-${tag_name}.xpi
latest_file_name=adena-extension-firefox-v${version}.xpi

echo "package version: ${version}"
echo "filename: $file_name"

rm -rf deploy-firefox deploy-firefox-latest

npx --yes web-ext@10 build \
  --source-dir packages/adena-extension/dist-firefox \
  --artifacts-dir deploy-firefox \
  --filename "$file_name" \
  --overwrite-dest

mkdir -p deploy-firefox-latest
cp "deploy-firefox/${file_name}" "deploy-firefox-latest/${latest_file_name}"

echo "deploy-firefox/${file_name}"
echo "deploy-firefox-latest/${latest_file_name}"
echo "build success."

#!/bin/sh
# setup arguments
changed_version=$1
current_version=$(awk -F'"' '/"version": ".+"/{ print $4; exit; }' package.json)
if [ -z "$changed_version" ]; then
    echo "Input the package version to change: (current: $current_version)"
    read changed_version
fi

# change version in package.json
version_prefix="\"version\": "
for entry in `(find . ! \( -path '*node_modules' -prune -o -path '*dist' -prune \) -name 'package.json' -o -name "v2.json")`
do
    sed -i '' -e "s/$version_prefix.*/$version_prefix\"$changed_version\",/g" $entry
done
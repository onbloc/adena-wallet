#!/bin/bash

branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "main" ]; then
  echo "current brunch is not 'main'"
  exit;
fi

current_version=$(awk -F'"' '/"version": ".+"/{ print $4; exit; }' package.json)
git tag -a "v$current_version" -m "v$current_version"
git push origin "v$current_version"
#!/bin/sh
# setup arguments
version=$(awk -F'"' '/"version": ".+"/{ print $4; exit; }' package.json)
tag_name=$1
file_name=adena-extension-${tag_name}.zip
latest_file_name=adena-extension-v${version}.zip

echo "package version: ${version}"
echo "filename: $file_name"

# compress build files
cd ./packages/adena-extension/dist
sudo zip -r build.zip ./*
sudo zip -d build.zip __MACOSX/\*
sudo zip -d build.zip \*/.DS_Store
cd ./../../../
if [[ -f "${file_name}" ]]; then
    rm -rf "${file_name}"
fi
mkdir deploy
sudo cp ./packages/adena-extension/dist/build.zip deploy/${file_name}
mkdir deploy-latest
sudo cp ./packages/adena-extension/dist/build.zip deploy-latest/${latest_file_name}

result_info="scripts/result.info"
echo "BUILD_VERSION:$tag_name" > $result_info
echo "PACKAGE_VERSION:$version" >> $result_info
echo "DEPLOY_CURRENT:$file_name" >> $result_info
echo "DEPLOY_LATEST:$latest_file_name" >> $result_info

echo "build success."
#!/bin/bash

# setup qa build version
today=$(date "+%Y%m%d")
build_info_file="scripts/build.info"
build_count=1
if [ -f $build_info_file ]; then
  current_build_version=`cat ./scripts/build.info`
  qa_build_version_prefix=$today-;
  if [[ $current_build_version == $qa_build_version_prefix* ]]; then
    build_count=$(sed "s/$qa_build_version_prefix//g" <<< "$current_build_version")
    build_count=$((build_count + 1))
  fi
else 
  touch $build_info_file
fi
build_version=$today-$build_count

# overwrite build.info
echo $build_version > $build_info_file
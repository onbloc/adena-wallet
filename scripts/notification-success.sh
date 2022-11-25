#!/bin/bash

# get value in 'scripts/result.info' by key
get_result_info() {
    result_info="scripts/result.info"
    column_name=$1
    target_line=$(awk "/$column_name:/" $result_info)
    echo $(sed "s/$column_name://g" <<< $target_line)
}

build_version=$(get_result_info "BUILD_VERSION")
package_version=$(get_result_info "PACKAGE_VERSION")
deploy_current=$(get_result_info "DEPLOY_CURRENT")
deploy_latest=$(get_result_info "DEPLOY_LATEST")

aws_path=$1
slack_path=$2

curl -XPOST -H "Content-type: application/json" -d "{
    \"blocks\": [
		{
			\"type\": \"section\",
			\"text\": {
				\"type\": \"mrkdwn\",
				\"text\": \"AdenaBuild Success !!\"
			}
		}
    ],
    \"attachments\": [
        {
            \"color\": \"#3ae98a\",
            \"blocks\": [
                {
                    \"type\": \"section\",
                    \"text\": {
                        \"type\": \"mrkdwn\",
                        \"text\": \"*Package Version: $package_version *\n*QA Version: $build_version *\n*Build File: $deploy_current *\n*Download Path: $aws_path/$deploy_current *\n\n\n\"
                    }
                },
                {
                    \"type\": \"section\",
                    \"text\": {
                        \"type\": \"mrkdwn\",
                        \"text\": \"*Download Here :point_down:*\"
                    }
                },
                {
                    \"type\": \"divider\"
                },
                {
                    \"type\": \"actions\",
                    \"elements\": [
                        {
                            \"type\": \"button\",
                            \"text\": {
                                \"type\": \"plain_text\",
                                \"text\": \"해당버전 다운로드\",
                                \"emoji\": true
                            },
                            \"value\": \"current_version\",
                            \"url\": \"$aws_path/$deploy_current\"
                        },
                        {
                            \"type\": \"button\",
                            \"text\": {
                                \"type\": \"plain_text\",
                                \"text\": \"최신버전 다운로드\",
                                \"emoji\": true
                            },
                            \"value\": \"latest_version\",
                            \"url\": \"$aws_path/$deploy_latest\"
                        }
                    ]
                }
            ]
            }
        ]
    }" "$2"
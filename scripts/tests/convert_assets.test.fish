#!/usr/bin/env fish_test

set -l file_dir (dirname (status -f))
source $file_dir/../convert_assets.fish

function setup
    set -g temp_dir (mktemp -d)
    cd $temp_dir
    trap teardown EXIT
end

function teardown
    cd -
    command rm -rf $temp_dir
end

@test "convert_and_update_video fails with non-existent file" (
    setup
    convert_and_update_video "non_existent_file.mp4" 2>/dev/null
    echo $status
) = 1

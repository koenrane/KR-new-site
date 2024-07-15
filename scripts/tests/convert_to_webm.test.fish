#!/usr/bin/env fish_test

set -l file_dir (dirname (status -f))
source $file_dir/../convert_to_webm.fish

function setup
    set -g temp_dir (mktemp -d)
    cd $temp_dir
    trap teardown EXIT
end

function teardown
    cd -
    command rm -rf $temp_dir
end

function create_test_video
    set -l filename $argv[1]

    ffmpeg -f lavfi -i rgbtestsrc -t 1 $filename >/dev/null 2>&1
end

# Helper to extract filename from path 
function get_filename
    echo $argv[1] | string split / | tail -1
end

for ext in $ALLOWED_EXTENSIONS # From convert_to_webm.fish
    @test "convert_and_update_video converts $ext to WebM" (
        setup

        create_test_video "test.$ext"
        convert_and_update_video "test.$ext"

        # Check file exists and is non-empty
        if ! test -s "test.webm"
            echo "File does not exist or is empty"
        end
        
        set -l old_size (stat -f%z "test.$ext")
        set -l new_size (stat -f%z "test.webm")
        # Check that new size is less than half of old size
        if  test $new_size -gt (math $old_size / 2)
            echo "New size is not less than half of old size"
        end

        echo 0
    ) = 0
end

#
#@test "convert_and_update_video converts GIF to WebM" (
#    setup
#    set -l input_file "test.gif"
#    ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=10 -t 1 $input_file >/dev/null 2>&1
#
#    convert_and_update_video $input_file
#
#    test -f "test.webm"; and file "test.webm" | string match -q "*WebM*"
#    echo $status
#) = 0
#
#@test "convert_and_update_video fails with non-existent file" (
#    setup
#    convert_and_update_video "non_existent_file.mp4"
#    echo $status
#) = 1
#
#@test "convert_and_update_video skips unsupported file types" (
#    setup
#    set -l input_file "test.txt"
#    touch $input_file
#
#    convert_and_update_video $input_file
#    echo $status
#) = 0
#
#@test "convert_and_update_video handles filenames with spaces" (
#    setup
#    set -l input_file "test file.mp4"
#    create_test_video "$input_file" 1
#
#    convert_and_update_video "$input_file"
#
#    test -f "test file.webm"; and file "test file.webm" | string match -q "*WebM*"
#    echo $status
#) = 0

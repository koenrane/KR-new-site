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
    set -l duration (math $argv[2] / 1) # Ensure duration is a number

    ffmpeg -f lavfi -i testsrc=duration=$duration:size=320x240:rate=30 -c:v libx264 -t $duration -pix_fmt yuv420p $filename
end

@test "convert_and_update_video converts MP4 to WebM" (
    setup
       
    set -l input_file "test.mp4"
    create_test_video $input_file 1
    
    convert_and_update_video $input_file
    
    test -f "test.webm"; and file "test.webm" | string match -q "*WebM*"
    echo $status
) = 0

#@test "convert_and_update_video converts MOV to WebM" (
#    setup
#    set -l input_file "test.mov"
#    create_test_video $input_file 1
#
#    convert_and_update_video $input_file
#
#    test -f "test.webm"; and file "test.webm" | string match -q "*WebM*"
#    echo $status
#) = 0
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

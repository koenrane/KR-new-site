#!/usr/bin/env fish

set current_dir (dirname (status filename))
set -l temp_dir (mkdtemp -d)

source $current_dir/../convert_assets.fish

function cleanup
    command rm $temp_dir/*
end
trap cleanup EXIT

function create_test_image
    set -l filename $temp_dir/$argv[1]
    mktemp $filename
    magick -size 100x100 xc:white $filename
end

# Test cases
set image_types jpg jpeg png
for type in $image_types
    @test "convert_asset handles $type file" (
        set -l input_filename "test.$type"
        create_test_image $input_filename
        
        set output (convert_asset $input_filename)
        echo $output | string match -q "*Processed $input_filename*"
        command rm $input_filename
    )
end

#set video_types gif mp4 mov
#for type in $video_types
#    @test "convert_asset handles $type file" (
#        set -l input_file "test.$type"
#
#        function sh; mock_convert_to_webm $argv; end
#
#        set output (convert_asset $input_file)
#        echo $output | string match -q "*Processed $input_file*"
#    )
#end
#
#@test "convert_asset handles unsupported file type" (
#    set -l input_file "test.txt"
#
#    set output (convert_asset $input_file)
#    test -z "$output"
#)
#
#@test "convert_asset with --strip_metadata flag" (
#    set -l input_file "test.jpg"
#
#    function sh; mock_convert_to_avif $argv; end
#    function fish; mock_update_references $argv; end
#    function exiftool; mock_exiftool $argv; end
#
#    set -g _flag_strip_metadata
#    set output (convert_asset $input_file)
#    echo $output | string match -q "*Mocked exiftool -all=*" 
#    and echo $output | string match -q "*Processed $input_file*"
#)
#
#@test "convert_asset with --remove_originals flag" (
#    set -l input_file "test.jpg"
#
#    function sh; mock_convert_to_avif $argv; end
#    function fish; mock_update_references $argv; end
#    function rm; mock_rm $argv; end
#
#    set -g _flag_remove_originals
#    set output (convert_asset $input_file)
#    echo $output | string match -q "*Mocked rm $input_file*" 
#    and echo $output | string match -q "*Processed $input_file*"
#)

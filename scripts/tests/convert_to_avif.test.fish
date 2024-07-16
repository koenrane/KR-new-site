#!/usr/bin/env fish_test

set -l file_dir (dirname (status -f))
source $file_dir/../convert_to_avif.fish
source $file_dir/../utils.fish

function setup
    set -g temp_dir (mktemp -d)
    cd $temp_dir
    trap teardown EXIT
end

function teardown
    command rm -rf $temp_dir
end

@test "convert_to_avif converts JPG to AVIF" (
    setup
    set -l input_file "$temp_dir/test.jpg"
    create_test_image $input_file "100x100"
    
    convert_to_avif $input_file
    
    test -f "test.avif"
    and file "test.avif" | string match -q "*AVIF*"
    echo $status
) = 0

@test "convert_to_avif converts PNG to AVIF" (
    setup
    set -l input_file "$temp_dir/test.png"
    create_test_image $input_file "100x100"
    
    convert_to_avif $input_file 
    
    test -f "test.avif"
    and file "test.avif" | string match -q "*AVIF*"
    echo $status
) = 0

@test "convert_to_avif fails with non-existent file" (
    setup
    convert_to_avif "non_existent_file.jpg" 2> /dev/null
    echo $status
) = 1

@test "convert_to_avif skips if AVIF already exists" (
    setup
    set -l input_file "$temp_dir/test.jpg"
    create_test_image $input_file "100x100"
    touch "test.avif"
    
    convert_to_avif $input_file | string match -q "*Skipping conversion*" 
    echo $status
) = 1

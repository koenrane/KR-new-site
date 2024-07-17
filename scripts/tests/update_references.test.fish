#!/usr/bin/env fish_test

set -l file_dir (dirname (status -f))
source $file_dir/../utils.fish
set -g references_file $file_dir/../update_references.fish
source $references_file 2>/dev/null

function setup
    set -g temp_dir (mktemp -d)
    cd $temp_dir
    git init -q # To avoid git errors in tests

    mkdir -p content
    mkdir -p quartz
    echo "Test content" >./content/test.md

    # Set up fake image
    set -g temp_img (mktemp quartz/old_image.jpg)

    trap teardown EXIT
end

# Teardown function to clean up after tests
function teardown
    command rm -rf $temp_dir
end

# Test update_references function with valid inputs
# Here, we go from "URL/quartz/old_image.jpg" to "URL/new_image.jpg"
@test "update_references updates markdown files correctly" (
    setup
    set -l filepath "$temp_dir/content/test.md"
    set -l image_path "$temp_dir/$temp_img"
    set -l original_content "![image]($R2_BASE_URL/$temp_img)"

    echo $original_content > $filepath

    update_references "$temp_img" "new_image.jpg" $temp_dir/content
    cat $filepath
) = "![image]($R2_BASE_URL/new_image.jpg)"

# Test update_references function with HTML reference
@test "update_references updates HTML src" (
    setup
    set -l filepath "$temp_dir/content/test.md"
    echo "<img src=\"old_image.jpg\"> abc" > $filepath

    if not test $temp_img = "quartz/old_image.jpg"
        echo "Unexpected filename for \$temp_img"
    end
    update_references "old_image.jpg" "new_image.jpg" $temp_dir/content
    cat $filepath
) = "<img src=\"new_image.jpg\"> abc"


# Test update_references function with multiple occurrences
@test "update_references updates multiple occurrences" (
    setup
    set -l filepath "$temp_dir/content/test.md"
    set -l image_path "$temp_dir/$temp_img"
    echo "![image1]($R2_BASE_URL/old_image.jpg) ![image2]($R2_BASE_URL/old_image.jpg)" > $filepath

    update_references "old_image.jpg" "new_image.jpg" $temp_dir/content
    echo (grep -o "new_image.jpg" $filepath | wc -l | string trim) # Count occurrences of new_image.jpg
) = 2

# Test update_references function with multiple files
@test "update_references updates multiple files" (
    setup
    mktemp $temp_dir/content/test_dir -d > /dev/null
    mktemp $temp_dir/content/test_dir/test2.md > /dev/null
    set -l filepaths "$temp_dir/content/test.md" "$temp_dir/content/test_dir/test2.md" 
    set -l image_path "$temp_dir/$temp_img"
    for filepath in $filepaths 
        echo "![image1]($R2_BASE_URL/old_image.jpg) ![image2]($R2_BASE_URL/old_image.jpg)" > $filepath
    end

    update_references "old_image.jpg" "new_image.jpg" $temp_dir/content
    echo (grep -o "new_image.jpg" $filepaths | wc -l | string trim) # Count occurrences of new_image.jpg
) = 4

# Test update_references function with no matches
@test "update_references handles no matches gracefully" (
    setup
    echo " " > $temp_dir/content/test.md

    update_references "$temp_dir/content/test.md" "new_image.jpg" $temp_dir/content
    echo (grep -o "No matches here" $temp_dir/content/test.md | wc -l | string trim) # Count occurrences of "No matches here"
) = 0

# Test handling of filenames with spaces
@test "script handles filenames with spaces" (
    setup
    mktemp $temp_dir/old\ image.jpg > /dev/null
    echo "![image]($R2_BASE_URL/old image.jpg)" > $temp_dir/content/test.md
    update_references "old image.jpg" "new image.jpg" $temp_dir/content 
    cat $temp_dir/content/test.md
) = "![image]($R2_BASE_URL/new image.jpg)"

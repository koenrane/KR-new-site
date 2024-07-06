#!/usr/bin/env fish_test

set -l file_dir (dirname (status -f))
source $file_dir/../utils.fish
set -l references_file $file_dir/../update_references.fish
source $references_file 2>/dev/null

function setup
    set -g temp_dir (mktemp -d)
    cd $temp_dir
    mkdir -p content
    mkdir -p quartz
    echo "Test content" >./content/test.md
    set -g GIT_ROOT $temp_dir
    trap teardown EXIT
end

# Teardown function to clean up after tests
function teardown
    command rm -rf $temp_dir
end

# Test sanitize_filename function
@test "sanitize_filename handles special characters" (
    set result (sanitize_filename 'file$with&special*.chars?/|')
    echo $result
) = 'file\$with\&special\*\.chars\?\/\|'


# Test update_references function with valid inputs
# Note: Extra echo statements will mess up syntax of @test
@test "update_references updates markdown files correctly" (
    setup
    set -l filepath "$GIT_ROOT/content/test.md"
    set -l image_path "$GIT_ROOT/quartz/old_image.jpg"
    set -l original_content "![image]($R2_BASE_URL/quartz/old_image.jpg)"
    mktemp $image_path > /dev/null

    echo $original_content > $filepath

    update_references "quartz/old_image.jpg" "new_image.jpg"
    set result (grep -q "![image]($R2_BASE_URL/new_image.jpg)" $filepath)
    echo (cat $filepath)
) = "![image]($R2_BASE_URL/new_image.jpg)"

# Test update_references function with non-existent source file
@test "update_references handles non-existent source file" (
    setup

    update_references "$GIT_ROOT/content/non_existent.md" "new_image.jpg" 2> /dev/null
    echo $status
) = 1

# Test update_references function with multiple occurrences
@test "update_references updates multiple occurrences" (
    setup
    set -l filepath "$GIT_ROOT/content/test.md"
    set -l image_path "$GIT_ROOT/quartz/old_image.jpg"
    mktemp $image_path > /dev/null
    echo "![image1]($R2_BASE_URL/old_image.jpg) ![image2]($R2_BASE_URL/old_image.jpg)" > $filepath

    update_references $image_path "new_image.jpg"
    echo (grep -o "new_image.jpg" $filepath | wc -l | string trim) # Count occurrences of new_image.jpg
) = 2

## Test update_references function with no matches
#@test "update_references handles no matches gracefully" (
#    setup
#    echo "No matches here" > $GIT_ROOT/content/test.md
#
#    update_references "$GIT_ROOT/content/test.md" "new_image.jpg"
#    grep -q "No matches here" $GIT_ROOT/content/test.md
#)
#
## Test command-line flag parsing
#@test "script parses command-line flags correctly" (
#    setup
#    echo "![image]($R2_BASE_URL/old_image.jpg)" > $GIT_ROOT/content/test.md
#    fish $references_file --source="$GIT_ROOT/content/test.md" --target="new_image.jpg"
#    grep -q "![image]($R2_BASE_URL/new_image.jpg)" $GIT_ROOT/content/test.md
#)
#
## Test handling of filenames with spaces
#@test "script handles filenames with spaces" (
#    setup
#    echo "![image]($R2_BASE_URL/old image.jpg)" > $GIT_ROOT/content/test.md
#    update_references "$GIT_ROOT/content/test.md" "new image.jpg"
#    grep -q "![image]($R2_BASE_URL/new image.jpg)" $GIT_ROOT/content/test.md
#)

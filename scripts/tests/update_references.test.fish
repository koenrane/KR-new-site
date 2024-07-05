#!/usr/bin/env fish_test

set -l file_dir (dirname (status -f))
source $file_dir/../utils.fish
source $file_dir/../update_references.fish

function setup
    set -g temp_dir (mktemp -d)
    cd $temp_dir
    mkdir -p content
    echo "Test content" >content/test.md
    set -g GIT_ROOT $temp_dir
end

# Teardown function to clean up after tests
function teardown
    rm -rf $temp_dir
end

# Test sanitize_filename function
@test "sanitize_filename handles special characters" (
    set result (sanitize_filename 'file$with&special*.chars?/|')
    echo $result
) = 'file\$with\&special\*\.chars\?\/\|'

## Test update_references function with valid inputs
#@test "update_references updates markdown files correctly" (
#    setup
#    echo "![image]($R2_BASE_URL/old_image.jpg)" > $GIT_ROOT/content/test.md
#
#    update_references "$GIT_ROOT/content/test.md" "new_image.jpg"
#    grep -q "![image]($R2_BASE_URL/new_image.jpg)" $GIT_ROOT/content/test.md
#    teardown
#)
#
## Test update_references function with non-existent source file
#@test "update_references handles non-existent source file" (
#    setup
#
#    update_references "$GIT_ROOT/content/non_existent.md" "new_image.jpg"
#    test $status -eq 1
#    teardown
#)
#
## Test update_references function with multiple occurrences
#@test "update_references updates multiple occurrences" (
#    setup
#    echo "![image1]($R2_BASE_URL/old_image.jpg) ![image2]($R2_BASE_URL/old_image.jpg)" > $GIT_ROOT/content/test.md
#
#    update_references "$GIT_ROOT/content/test.md" "new_image.jpg"
#    set result (grep -c "new_image.jpg" $GIT_ROOT/content/test.md)
#    test $result -eq 2
#    teardown
#)
#
## Test update_references function with no matches
#@test "update_references handles no matches gracefully" (
#    setup
#    echo "No matches here" > $GIT_ROOT/content/test.md
#
#    update_references "$GIT_ROOT/content/test.md" "new_image.jpg"
#    grep -q "No matches here" $GIT_ROOT/content/test.md
#    teardown
#)
#
## Test command-line flag parsing
#@test "script parses command-line flags correctly" (
#    setup
#    echo "![image]($R2_BASE_URL/old_image.jpg)" > $GIT_ROOT/content/test.md
#    ./your_script.fish --source="$GIT_ROOT/content/test.md" --target="new_image.jpg"
#    grep -q "![image]($R2_BASE_URL/new_image.jpg)" $GIT_ROOT/content/test.md
#    teardown
#)
#
## Test handling of filenames with spaces
#@test "script handles filenames with spaces" (
#    setup
#    echo "![image]($R2_BASE_URL/old image.jpg)" > $GIT_ROOT/content/test.md
#    update_references "$GIT_ROOT/content/test.md" "new image.jpg"
#    grep -q "![image]($R2_BASE_URL/new image.jpg)" $GIT_ROOT/content/test.md
#    teardown
#)

#!/usr/bin/env fish

set -l file_dir (dirname (status -f))
source $file_dir/utils.fish

function sanitize_filename
    echo "$argv[1]" | sed -E "s#[\\\$&*.?/|]#\\\&#g"
end

function update_references
    # Function to update references to a file in the content directory
    # Arguments:
    #  $1: Source file path, string. The source file must exist.
    #    After leading .*quartz and then leading / are removed, the rest is used as the key.
    #    For example, if the source file path is ..quartz/test.jpg, then the key is test.jpg. 
    #  $2: Target file path, string. References to source will be updated to $R2_BASE_URL/$2.
    #   For example, if the target file path is test.jpg and $R2_BASE_URL (defined in utils.fish) is test.com, 
    #    then the references to source will be updated to test.com/test.jpg.
    # Returns:
    #  None
    # Side-effects:
    #  Updates references to the source file in $GIT_ROOT/content/**md files.
    set source_path $argv[1]
    set target_path $argv[2]

    # Input validation
    if test ! -f "$source_path"
        echo "Error: Source file '$source_path' not found. Not updating references to it." >&2
        return 1
    end

    # Get original and new filenames
    set original_filename (get_r2_key "$source_path")

    # Sanitize filenames
    set original_filename (sanitize_filename "$original_filename")
    set new_filename (sanitize_filename "$target_path")
    set escaped_base_url (sanitize_filename "$R2_BASE_URL/")
    set replacement $escaped_base_url$new_filename

    # Update references 
    set -l files_to_update (find "$GIT_ROOT/content" -iname "*.md" -type f)
    #echo (set_color red)"s|(?<!$escaped_base_url)(?<=[\"\(])[^\"\)]]*$original_filename|$new_filename|g" (set_color normal)
    perl -i.bak -pe "s|(?<!$escaped_base_url)(?<=[\"\(])[^\"\)]*$original_filename|$replacement|g" $files_to_update
end

# Parse command-line flags
argparse 'source=+' 'target=+' -- $argv

update_references $_flag_source $_flag_target

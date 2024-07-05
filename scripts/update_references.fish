#!/usr/bin/env fish

set -l file_dir (dirname (status -f))
source $file_dir/utils.fish
source $file_dir/upload_to_r2.fish # Import the get_r2_key function 

# Function to sanitize filenames 
function sanitize_filename
    echo "$argv[1]" | sed -E "s#[\\\$&*.?/|]#\\\&#g"
end

# Function to update references 
function update_references
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

    # Update references 
    set -l files_to_update (find "$GIT_ROOT/content" -iname "*.md" -type f)
    perl -i.bak -pe "s|(?<!$escaped_base_url)(?<=\")[^\"]*$original_filename|$new_filename|g" $files_to_update
end

# Check if this script is the main program or being sourced
if test "$argv" = (status -f)
    # Parse command-line flags
    argparse 'source=+' 'target=+' -- $argv

    # Call the function to update references
    update_references $_flag_source $_flag_target
end

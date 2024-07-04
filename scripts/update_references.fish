#!/usr/bin/env fish
set -x WEBSITE_DIR "$HOME/Downloads/turntrout.com"
source "$WEBSITE_DIR"/scripts/upload_to_r2.fish # Import the get_r2_key function 

# Function to sanitize filenames 
function sanitize_filename
    string replace -ar '[\\$&*?]' "\\$0" $argv[1]
end

# Function to update references 
function update_references
    set source_path $argv[1]
    set target_path $argv[2]

    # Input validation
    if test ! -f "$source_path"
        echo "Error: Source file '$source_path' not found." >&2
        return 1
    end

    # Get original and new filenames
    set original_filename (get_r2_key "$source_path")

    # Sanitize filenames
    set original_filename (sanitize_filename "$original_filename")
    set new_filename (sanitize_filename "$target_path")

    # Update references 
    find "$WEBSITE_DIR/content" -iname "*.md" -o -iname "*.html" -o -iname "*.txt" -type f | while read file
        sed -i.bak -e "s|$original_filename|$new_filename|g" $file
    end
    echo "Updated references to: $new_filename"
end


# Parse command-line flags 
argparse 'source=+' 'target=+' -- $argv

# Call the function to update references
update_references $_flag_source $_flag_target

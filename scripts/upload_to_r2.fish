#!/usr/bin/env fish

set GIT_ROOT (git rev-parse --show-toplevel)
set R2_BUCKET_NAME turntrout
set R2_BASE_URL "https://assets.turntrout.com"

argparse r/remove_originals -- $argv #remove originals can be set anywhere in the arguments

function get_r2_key
    # Remove the path up to and including 'quartz/' to get the R2 key. Also remove leading '/'
    set -l filepath $argv[1]
    set -l r2_key (string replace -r '.*quartz/' '' $filepath | string replace -r '^/' '')
    echo $r2_key
end

# Function to upload a file to R2
function upload_to_r2
    set file $argv[1]

    # Remove the path up to and including 'quartz/' to get the R2 key
    # Generally this starts with static/
    set r2_key (get_r2_key $file)

    if test -z "$r2_key"
        echo "Error: File path does not contain 'quartz/'."
        return 1
    end

    echo "Uploading $file to R2 with key: $r2_key"
    set upload_target "r2:$R2_BUCKET_NAME/$r2_key"

    #rclone copyto $file $upload_target

    # Construct the full R2 URL
    set r2_url "$R2_BASE_URL/$r2_key"

    echo "Changing \"$file\" references to $r2_url."
    fish $GIT_ROOT/scripts/update_references.fish --source "$file" --target "$r2_url"

    # If the "remove_originals" flag is set, remove the original file
    if set -q _flag_remove_originals
        rm $file
        echo "Removing original file: $file"
    end
end

if test (count $argv) -gt 0 # Check for at least one argument
    # Assuming the last argument is the file to upload
    set FILE_TO_UPLOAD $argv[-1]

    # Check if file exists
    if test -f "$FILE_TO_UPLOAD"
        upload_to_r2 $FILE_TO_UPLOAD
    else
        echo "File not found: $FILE_TO_UPLOAD"
        exit 1
    end
end

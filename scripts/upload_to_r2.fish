#!/usr/bin/env fish

set -l file_dir (dirname (status -f))
source $file_dir/utils.fish

# Parse arguments
argparse r/remove-originals v/verbose -- $argv
or begin
    echo "Error: Failed to parse arguments"
    exit 1
end

# Check for verbose flag
set verbose 0
if set -q _flag_verbose
    set verbose 1
end

# Check for verbose flag
set remove_originals 0
if set -q _flag_remove_originals
    set remove_originals 1
end


function upload_to_r2
    set file $argv[1]
    set r2_key (get_r2_key $file)
    if test -z "$r2_key"
        echo "Error: File path does not contain 'quartz/'."
        return 1
    end

    if test $verbose -eq 1
        echo "Uploading $file to R2 with key: $r2_key"
    end

    set upload_target "r2:$R2_BUCKET_NAME/$r2_key"
    rclone copyto $file $upload_target

    if test $verbose -eq 1
        echo "Changing \"$file\" references to $R2_BASE_URL/$r2_key"
    end

    fish $GIT_ROOT/scripts/update_references.fish --source "$file" --target "$r2_key"

    if test $remove_originals -eq 1
        if test $verbose -eq 1
            echo "Removing original file: $file"
        end
        command rm $file
    end

    if test $verbose -eq 1
        echo ""
    end
end

if test (count $argv) -eq 0
    echo "Error: No file specified for upload"
    exit 1
end

set FILE_TO_UPLOAD $argv[-1]
if test -f "$FILE_TO_UPLOAD"
    upload_to_r2 $FILE_TO_UPLOAD
else
    echo "File not found: $FILE_TO_UPLOAD"
    exit 1
end

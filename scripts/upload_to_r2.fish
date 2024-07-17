#!/usr/bin/env fish

set -l file_dir (dirname (status -f))
source $file_dir/update_references.fish
source $file_dir/utils.fish

# Parse arguments
argparse r/remove-originals v/verbose -- $argv
or begin
    echo "Error: Failed to parse arguments"
    exit 1
end

# Check for verbose flag
set -g verbose 0
if set -q _flag_verbose
    set -g verbose 1
end

# Check for verbose flag
set -g remove_originals 0
if set -q _flag_remove_originals
    set -g remove_originals 1
end


function upload_to_r2
    set -l file $argv[1]
    set -l r2_key (get_r2_key $file)
    if test -z "$r2_key"
        echo "Error: File path does not contain 'quartz/'."
        return 1
    end

    if test $verbose -eq 1
        echo "Uploading $file to R2 with key: $r2_key"
    end

    set -l upload_target "r2:$R2_BUCKET_NAME/$r2_key"
    rclone copyto $file $upload_target

    if test $verbose -eq 1
        echo "Changing \"$file\" references to $R2_BASE_URL/$r2_key"
    end

    update_references "$file" "$R2_BASE_URL/$r2_key"

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

if status --is-interactive
    set -l FILE_TO_UPLOAD $argv[-1]
    if test -f "$FILE_TO_UPLOAD"
        upload_to_r2 $FILE_TO_UPLOAD
    else
        echo "File not found: $FILE_TO_UPLOAD"
        exit 1
    end
end

#!/usr/bin/env fish

set R2_BUCKET_NAME turntrout
set R2_BASE_URL "https://assets.turntrout.com"

# Function to upload a file to R2
function upload_to_r2
    set file $argv[1]
    set r2_key $file #(basename "$file")

    echo "Uploading $file to R2..."
    rclone copyto $file r2:$R2_BUCKET_NAME/$r2_key

    # Construct the full R2 URL
    set r2_url "$R2_BASE_URL/$r2_key"
    echo "R2 URL: $r2_url"

    sh update_references.sh --source $file --target $r2_url
end

# Main Script Logic
if set -q argv[1]
    set FILE_TO_UPLOAD $argv[1]

    # Check if file exists
    if test -f "$FILE_TO_UPLOAD"
        upload_to_r2 $FILE_TO_UPLOAD
    else
        echo "File not found: $FILE_TO_UPLOAD"
        exit 1
    end
else
    echo "Usage: $0 <file>"
    exit 1
end

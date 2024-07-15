#!/usr/bin/env fish

# Initialize argparse
argparse r/remove-originals s/strip-metadata -- $argv

# Set boolean variables based on provided flags
set -g remove_originals false
set -g strip_metadata false
if set -q _flag_remove_originals
    set -g remove_originals true
end
if set -q _flag_strip_metadata
    set -g strip_metadata true
end

set -l FILE_DIR (dirname (status -f))
source $FILE_DIR/convert_to_webm.fish
source $FILE_DIR/update_references.fish

# Function to handle conversion and optimization of a single file
function convert_asset
    set -l input_file $argv[1]
    set -l input_ext (string replace -r '^.+\.' '' $input_file)
    set -l output_file ""

    switch $input_ext
        case jpg jpeg png
            fish scripts/convert_to_avif.fish $input_file
            set -l output_file (string replace -r '\.[^.]+$' '.avif' $input_file)
            update_references source=$input_file target=$output_file

        case $ALLOWED_EXTENSIONS # Handled in
            set -l output_file (string replace -r '\.[^.]+$' '.webm' $input_file)
            fish $FILE_DIR/convert_to_webm.fish "$input_file"
            if test $status -ne 0
                echo "Failed to convert $input_file to WebM" >&2
                return 1
            end

            set -l base (basename "$input_file")
            set -l base_name_no_ext (string replace -r '\.[^.]*$' '' "$base")

            # If replacing a gif, we need to tag the video element
            if test $input_ext -eq gif
                set -l original "<img src=[\"'\'']\?($base_name_no_ext)\.gif[\"'\'']\?([^>]*)>"
                set -l replacement "<video autoplay loop muted playsinline src=\"\1.webm\" \2 type=\"video/webm\"><source src=\"\1.webm\"><\/video>"
            else
                set -l original "$base_name_no_ext\.(mp4|mov|MP4|MOV)(.*video\/)mp4"
                set -l replacement "$base_name_no_ext.webm\2webm"
            end

            replace_references $original $replacement "$GIT_ROOT/content"

        case '*'
            return 0
    end

    # Strip Metadata (If --strip-metadata flag is provided)
    if test "$strip_metadata" = true
        if not exiftool -all= $output_file
            echo "Failed to strip metadata from $output_file" >&2
        end
    end

    # Remove Original File (If --remove-originals flag is provided)
    if test "$remove_originals" = true
        if not tp $input_file
            echo "Failed to remove original file $input_file" >&2
        end
    end

    set_color green
    echo "Processed $input_file"
    set_color normal
end

# Traverse through all files in the specified directory and subdirectories
find quartz/static -type f ! -name '.DS_Store' | while read -l file
    convert_asset $file
end

#!/usr/bin/env fish

argparse run_script -- $argv
set -g run_script false
if set -q _flag_run_script
    set -g run_script true
end

# Configuration
set -g QUALITY 21
set -g VIDEO_EXTENSIONS_TO_CONVERT gif mov mp4 avi mpeg # Space-separated list

# Function to convert and update a single video
function convert_and_update_video

    set -l input_file $argv[1] # Get the first argument as the input file

    # Input validation
    if not test -f "$input_file"
        echo "Error: Input file $input_file not found." >&2
        return 1
    end

    set -l file_extension (path extension $input_file)
    set -l file_name_no_ext (path change-extension '' $input_file)
    set -l file_name_only (path basename $file_name_no_ext)
    set -l dir_path (path dirname $input_file)

    # Remove the leading dot from the extension
    set -l file_extension (string replace -r '^\\.' '' $file_extension)


    # File type check
    if not contains $file_extension $VIDEO_EXTENSIONS_TO_CONVERT
        echo "Skipping '$input_file'. Only $VIDEO_EXTENSIONS_TO_CONVERT are supported." >&2
        return 1
    end

    # Two-Pass Encoding for Optimal Quality (overwrites)
    set -l encoding libvpx-vp9
    ffmpeg -i "$input_file" -y -c:v $encoding -crf $QUALITY -b:v 0 -pass 1 -loglevel fatal -an -f null /dev/null >/dev/null

    # Second pass
    set -l output_file "$file_name_no_ext.webm"
    ffmpeg -i $input_file -y -c:v $encoding -c:a libopus -crf $QUALITY -b:v 0 -pass 2 -auto-alt-ref 1 -row-mt 1 -loglevel fatal -movflags faststart $output_file >/dev/null

    if test $status -ne 0
        echo "Error: Failed to convert '$input_file'." >&2
        return 1
    end
end

# Get filename from command-line argument
if $run_script
    if set -q $argv[1]
        convert_and_update_video $argv[1]
    else
        echo "Error: Please provide an input file." >&2
        exit 1
    end
end

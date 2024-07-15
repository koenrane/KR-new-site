#!/usr/bin/env fish

# Configuration
set -g QUALITY 21
set -g ALLOWED_EXTENSIONS gif mov mp4 avi # Space-separated list

# Function to convert and update a single video
function convert_and_update_video

    set -l input_file $argv[1] # Get the first argument as the input file

    # Input validation
    if not test -f "$input_file"
        echo "Error: Input file $input_file not found." >&2
        return 1
    end

    set -l file_extension (string split -r '.' $input_file)[-1]
    set -l file_name_no_ext (string split -r '.' $input_file)[-2]

    # File type check
    if not contains $file_extension $ALLOWED_EXTENSIONS
        echo "Warning: Skipping '$input_file'. Only $ALLOWED_EXTENSIONS are supported." >&2
        return 0
    end
    if test $file_extension = mp4
        set -g encoding libvpx-vp9
    else
        set -g encoding mpeg4 # TODO change to libx265
    end

    # Two-Pass Encoding for Optimal Quality (overwrites)
    ffmpeg -i "$input_file" -y -c:v $encoding -crf $QUALITY -b:v 0 -pass 1 -loglevel fatal -an -f null /dev/null >/dev/null # Redirect stderr to stdout for suppression

    # Second pass
    set -l output_file "$file_name_no_ext.webm"
    ffmpeg -i $input_file -y -c:v $encoding -c:a libopus -crf $QUALITY -b:v 0 -pass 2 -auto-alt-ref 1 -row-mt 1 -loglevel fatal -movflags faststart $output_file >/dev/null

    if test $status -ne 0
        echo "Error: Failed to convert '$input_file'." >&2
        return 1
    end
end

# Get filename from command-line argument
if status --is-interactive
    if set -q $argv[1]
        convert_and_update_video $argv[1]
    else
        echo "Error: Please provide an input file." >&2
        exit 1
    end
end

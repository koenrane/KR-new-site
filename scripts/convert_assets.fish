#!/usr/bin/env fish

# Initialize argparse
argparse r/remove_originals s/strip_metadata -- $argv

# Function to handle conversion and optimization of a single file
function convert_asset
    set input_file $argv[1]
    set input_ext (string replace -r '^.+\.' '' $input_file)
    set output_file

    switch $input_ext
        case jpg jpeg png
            sh scripts/convert_to_avif.sh $input_file
            if test $status -ne 0
                return 1
            end
            set output_file (string replace -r '\.[^.]+$' '.avif' $input_file)

            echo "Output file: $output_file"
            fish scripts/update_references.fish --source $input_file --target $output_file

        case gif mp4 mov
            set output_file (string replace -r '\.[^.]+$' '.webm' $input_file)
            sh scripts/convert_to_webm.sh $input_file
            # Has its own reference replacement

        case flac
            # Example: Audio Compression (FLAC to Opus)
            # set output_file (string replace -r '\.[^.]+$' '.opus' $input_file)
            # ffmpeg -i $input_file $output_file

        case *
            return 0
    end

    # Strip Metadata (If --strip_metadata flag is provided)
    if set -q _flag_strip_metadata
        exiftool -all= $output_file
    end

    # Remove Original File (If --remove_originals flag is provided)
    if set -q _flag_remove_originals -a -f $output_file
        rm $input_file
    end

    set_color green
    echo "Processed $input_file"
    set_color normal
end

# Traverse through all files in the specified directory and subdirectories
find quartz/static -type f | while read -l file
    convert_asset $file
end

#!/usr/bin/env fish

argparse "run_script=" -- $argv
set -g run_script false
if set -q _flag_run_script
    set -g run_script true
end

# Configuration
set -g QUALITY 50 # Set desired AVIF quality

# Function to convert an image to AVIF
function convert_to_avif
    set -l image_path $argv[1] # Get the image path from the argument

    # Input validation
    if not test -f "$image_path"
        echo "Error: File '$image_path' not found." >&2
        return 1
    end

    # Get original filename and extension
    set -l filename (basename "$image_path")
    set -l extension (string split -r '.' $filename)[-1]
    set -l filename_no_ext (string replace -r "\.$extension\$" '' $filename)

    # Construct new AVIF filename and path
    set -l avif_filename "$filename_no_ext.avif"
    set -l filepath (dirname "$image_path")
    set -l avif_path "$filepath/$avif_filename"

    # Check if AVIF already exists
    if test -f "$avif_path"
        echo "AVIF file '$avif_path' already exists. Skipping conversion." >&2
        return 2
    end

    # Convert with ImageMagick
    magick "$image_path" -quality "$QUALITY" "$avif_path"
    #echo "$avif_filename"
    #echo "Converted: $image_path -> $avif_path"

end

# Get the filename from the command-line argument
if $run_script
    if set -q $argv[1]
        convert_to_avif $argv[1]
    else
        echo "Error: No filename provided." >&2
        exit 1
    end
end

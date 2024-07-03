#!/bin/bash

# Configuration
QUALITY=50 # Set desired AVIF quality

# Function to convert an image to AVIF
convert_to_avif() {
	local image_path="$1" # Get the image path from the argument
	local overall_path="$HOME/Downloads/turntrout.com/$image_path"

	# Input validation
	if ! [ -f "$overall_path" ]; then
		echo "Error: File '$overall_path' not found."
		return 1
	fi

	# Get original filename and extension
	filename=$(basename "$overall_path")
	extension="${filename##*.}"
	filename_no_ext="${filename%.*}"

	# Construct new AVIF filename and path
	avif_filename="${filename_no_ext}.avif"
	filepath=$(dirname "$overall_path")
	avif_path="$filepath/$avif_filename"

	# Check if AVIF already exists
	if [ -f "$avif_path" ]; then
		# echo "AVIF file '$avif_path' already exists. Skipping conversion."
		return 0 # Indicate that it's OK to replace references
	fi

	# Convert with ImageMagick
	magick "$overall_path" -quality "$QUALITY" "$avif_path"
	echo "Converted: $overall_path -> $avif_path"
}

# Get the filename from the command-line argument
if [ "$#" -eq 0 ]; then
	echo "Error: No filename provided."
	exit 1
fi

# Call the function to convert the image
convert_to_avif "$1"

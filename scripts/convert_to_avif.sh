#!/bin/bash

# Configuration
QUALITY=50 # Set desired AVIF quality

# Function to convert an image to AVIF
convert_to_avif() {
	local image_path="$1" # Get the image path from the argument

	# Input validation
	if ! [ -f "$image_path" ]; then
		echo "Error: File '$image_path' not found."
		return 1
	fi

	# Get original filename and extension
	filename=$(basename "$image_path")
	extension="${filename##*.}"
	filename_no_ext="${filename%.*}"

	# Construct new AVIF filename and path
	avif_filename="${filename_no_ext}.avif"
	filepath=$(dirname "$image_path")
	avif_path="$filepath/$avif_filename"

	# Check if AVIF already exists
	if [ -f "$avif_path" ]; then
		echo "AVIF file '$avif_path' already exists. Skipping conversion."
		return 0
	fi

	# Convert with ImageMagick
	magick "$image_path" -quality "$QUALITY" "$avif_path"
	echo "Converted: $image_path -> $avif_path"
}

# Get the filename from the command-line argument
if [ "$#" -eq 0 ]; then
	echo "Error: No filename provided."
	exit 1
else
	image_path="$1"
fi

# Call the function to convert the image
convert_to_avif "$image_path"

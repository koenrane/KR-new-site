#!/bin/bash

# Configuration
QUALITY=50 # Set desired AVIF quality
WEBSITE_DIR="/Users/turntrout/Downloads/turntrout.com"
ALLOWED_EXTENSIONS=("gif" "mov" "mp4" "avi")

# Function to convert and update a single video
convert_and_update_video() {
	local input_file="$1"

	# Input validation
	if [[ ! -f "$input_file" ]]; then
		echo "Error: Input file '$input_file' not found." >&2 # Redirect error message to stderr
		return 1
	fi

	file_extension="${input_file##*.}"

	# File type check
	if [[ ! " ${ALLOWED_EXTENSIONS[*]} " =~ " $file_extension " ]]; then
		echo "Warning: Skipping '$input_file'. Only GIF, MOV, and MP4 are supported." >&2
		return 0
	fi

	file_name_no_ext="${input_file%.*}"

	# Two-Pass Encoding for Optimal Quality
	ffmpeg -i "$input_file" -n -c:v libvpx-vp9 -crf 23 -b:v 800k -pass 1 -loglevel error -an -f null /dev/null -loglevel fatal
	ffmpeg -i "$input_file" -n -c:v libvpx-vp9 -crf 23 -b:v 800k -pass 2 -auto-alt-ref 1 -lag-in-frames 25 -row-mt 1 -movflags faststart -vf scale=-2:720 -loglevel fatal -an "$file_name_no_ext.webm"

	base=$(basename "$input_file")
	base_name_no_ext="${base%.*}"

	# Update references in markdown and TSX files
	find "$WEBSITE_DIR/content" "$WEBSITE_DIR/quartz" \( -iname "*.md" -o -iname "*.tsx" \) -exec sed -i.bak "s|<img src={?\"\($base_name_no_ext\).($file_extension)\"?}\([^>]*\)>|<video autoplay loop muted playsinline><source src=\"\1.webm\" \2 type=\"video/webm\"></video>|g" {} \;
}

# Get the filename from the command-line argument
if [[ $# -eq 0 ]]; then
	echo "Error: Please provide an input file." >&2
	exit 1
else
	convert_and_update_video "$1"
fi

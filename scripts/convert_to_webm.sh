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

	# Two-Pass Encoding for Optimal Quality (overwrites)
	ffmpeg -i "$input_file" -y -c:v libvpx-vp9 -crf 21 -b:v 0 -pass 1 -loglevel fatal -an -f null /dev/null -nostdin --

	# Second pass
	output_file="$file_name_no_ext.webm"
	ffmpeg -i "$input_file" -y -c:v libvpx-vp9 -c:a libopus -crf 21 -b:v 0 -pass 2 -auto-alt-ref 1 -lag-in-frames 25 -nostdin -row-mt 1 -movflags faststart -vf scale=-2:720 -loglevel fatal "$output_file" --

	if [ ! $? -eq 0 ]; then
		echo "Error: Failed to convert '$input_file'." >&2
		return 1
	fi

	base=$(basename "$input_file")
	base_name_no_ext="${base%.*}"

	process_file() {
		local file="$1"
		local base="$2"
		local base_name_no_ext="${base%.*}"

		if [[ "$base" == *".gif" ]]; then
			# For GIF files: Replace <img> tags with <video> tags
			sed -i.bak -E '
                s|<img src=[\"'\'']\?('$base_name_no_ext')\.gif[\"'\'']\?([^>]*)>|<video autoplay loop muted playsinline src="\1.webm" \2 type="video/webm"/>|g
            ' "$file"
		else
			sed -i.bak -E 's/'"$base_name_no_ext"'\.(mp4|mov|MP4|MOV)(.*video\/)mp4/'"$base_name_no_ext"'.webm\2webm/gi' "$file"
		fi
	}

	export -f process_file

	# Update references in markdown and TSX files
	# TODO update to fish util
	find "$WEBSITE_DIR/content" "$WEBSITE_DIR/quartz" \( -iname "*.md" -o -iname "*.tsx" \) -exec bash -c 'process_file "$1" '"$base" _ {} \;
}

# Get the filename from the command-line argument
if [[ $# -eq 0 ]]; then
	echo "Error: Please provide an input file." >&2
	exit 1
else
	convert_and_update_video "$1"
fi

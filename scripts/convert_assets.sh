#!/bin/bash

# Script to convert assets, remove originals, and strip metadata

# Input validation for the --remove_originals flag
while [[ $# -gt 0 ]]; do
	case "$1" in
	--remove_originals)
		remove_originals=true
		shift
		;;
	--strip_metadata)
		strip_metadata=true
		shift
		;;
	*)
		echo "Unknown option: $1"
		exit 1
		;;
	esac
done

# Function to handle conversion and optimization of a single file
convert_asset() {
	local input_file="$1"

	case "$input_file" in
	# AVIF Conversion
	*.jpg | *.jpeg | *.png)
		sh scripts/convert_to_avif.sh "$input_file"

		output_file="${input_file%.*}.avif"
		sh scripts/update_references.sh --source "$input_file" --target "$output_file"
		;;

	# WEBM Conversion & Optimization
	*.gif | *.mp4 | *.mov)
		output_file="${input_file%.*}.webm"
		sh scripts/convert_to_webm.sh "$input_file"
		# Has its own reference replacement
		;;

	# Audio Compression (Example: FLAC to Opus)
	*.flac)
		# output_file="${input_file%.*}.opus"
		# ffmpeg -i "$input_file" "$output_file"
		;;

	*) # Not supported
		return 0
		;;
	esac

	# Strip Metadata (If --strip_metadata flag is provided)
	if [ "$strip_metadata" = true ]; then
		exiftool -all= "$output_file"
	fi

	# Remove Original File (If --remove_originals flag is provided)
	if [ "$remove_originals" = true ] && [ -f "$output_file" ]; then
		rm "$input_file"
	fi
}

# Traverse through all files in the current directory and subdirectories
find quartz/static -type f | while read -r file; do
	convert_asset "$file"
done

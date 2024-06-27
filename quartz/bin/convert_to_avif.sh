#!/bin/bash

# Configuration
QUALITY=50 # Set desired AVIF quality (0-63)
WEBSITE_DIR="/Users/turntrout/Downloads/turntrout.com"
CONTENT_DIR="$WEBSITE_DIR/content"

# Find Image Files (with multiple extensions)
EXTENSIONS=("jpg" "jpeg" "png") # Using an array for better handling
find_command="find \"$WEBSITE_DIR/quartz/static\" \"$WEBSITE_DIR/content/Attachments\" -type f \( "
for ext in "${EXTENSIONS[@]}"; do
	find_command+=" -iname \"**.$ext\" -o"
done
find_command="${find_command% -o} \)" # Remove trailing "-o"
eval "$find_command" | while read -r image_path; do

	# Get original filename and extension
	filename=$(basename "$image_path")
	extension="${filename##*.}"
	filename_no_ext="${filename%.*}"

	# Construct new AVIF filename and path
	avif_filename="${filename_no_ext}.avif"
	filepath=$(dirname "$image_path")
	avif_path="$filepath/$avif_filename"

	# # Convert with ImageMagick
	magick "$image_path" -quality "$QUALITY" "$avif_path"
	echo "Converted: $image_path -> $avif_path"

	# Update references (only in .md, .html, and .txt files)
	find "$CONTENT_DIR" -iname "*.md" -type f -exec sed -i '' "s|$filename|$avif_filename|g" {} +
	echo "Updated references to: $avif_filename"

done

echo "Conversion and reference updates complete!"

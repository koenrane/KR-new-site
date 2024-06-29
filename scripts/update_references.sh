#!/bin/bash

# Configuration
WEBSITE_DIR="~/Downloads/turntrout.com"

sanitize_filename() {
	local filename="$1"
	filename="${filename//\\/\\\\}" # Escape backslashes
	filename="${filename//\$/\\$}"  # Escape dollar signs
	filename="${filename//\&/\\&}"  # Escape ampersands
	filename="${filename//\*/\\\*}" # Escape asterisks
	filename="${filename//\?/\\\?}" # Escape question marks
	echo "$filename"
}

update_references() {
	local source_path="$1"
	local target_path="$2"

	# Input validation
	if ! [ -f "$source_path" ]; then
		echo "Error: Source file '$source_path' not found." >>/dev/stderr
		return 1
	fi

	# Get original and new filenames
	original_filename=$(basename "$source_path")
	new_filename=$(basename "$target_path")

	# Sanitize the filenames before using them in sed
	original_filename=$(sanitize_filename "$original_filename")
	new_filename=$(sanitize_filename "$new_filename")

	# Update references in files within the content directory
	find "$WEBSITE_DIR/content" -iname "*.md" -o -iname "*.html" -o -iname "*.txt" -type f -exec sed -i '' "s/$original_filename/$new_filename/g" {} +
	echo "Updated references to: $new_filename"
}

# Parse command-line flags
source_path=""
target_path=""

while [[ $# -gt 0 ]]; do
	case "$1" in
	--source)
		source_path="$2"
		shift 2
		;;
	--target)
		target_path="$2"
		shift 2
		;;
	*)
		echo "Unknown option: $1"
		exit 1
		;;
	esac
done

# Validate that both source and target flags are provided
if [ -z "$source_path" ] || [ -z "$target_path" ]; then
	echo "Error: Both --source and --target flags are required."
	exit 1
fi

# Call the function to update references
update_references "$image_path"

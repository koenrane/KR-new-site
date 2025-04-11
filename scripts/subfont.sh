#!/usr/bin/env bash

# Only subset files that are larger than 1100 bytes
html_files=$(find public -type f -size +1100c -name "*.html")

# Count number of files
num_files=$(echo "$html_files" | wc -w)
echo "Subsetting fonts in $num_files files"

# Run subfont on all files
# shellcheck disable=SC2086
subfont $html_files --formats woff2 --in-place --instance --inline-css --no-recursive

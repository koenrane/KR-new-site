#!/usr/bin/env bash
# scripts/subfont.sh

# Only subset files that are larger than 1100 bytes
html_files=$(find public -type f -size +1100c -name "*.html")

# Count number of files
num_files=$(echo "$html_files" | wc -w)
echo "Subsetting fonts in $num_files files"

GIT_ROOT=$(git rev-parse --show-toplevel)

# Run subfont on all files
subfont $html_files --formats woff2 --in-place --instance --inline-css --no-recursive

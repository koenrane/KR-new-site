#!/usr/bin/env bash
# scripts/subfont.sh

# Only subset files that are larger than 900 bytes
html_files=$(find public -type f -size +900c -name "*.html")

# Count number of files
num_files=$(echo "$html_files" | wc -w)
echo "Subsetting fonts in $num_files files"

# Run subfont on all files
subfont $html_files --fallbacks --formats woff2 --in-place --instance --inline-css

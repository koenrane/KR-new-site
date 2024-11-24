#!/usr/bin/env fish
# scripts/subfont.fish

# Only subset files that are larger than 900 bytes
set -l html_files (find public -type f -size +900c -name "*.html")

set -l num_files (echo $html_files | wc -w)
echo "Subsetting fonts in $num_files files"

subfont $html_files --fallbacks --formats woff2 --in-place --instance 2>/dev/null
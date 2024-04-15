# We want to host all images locally
function download_image
    set -l url $argv[1]
    set -l filename (basename $url)

    echo "Downloading: $url to /tmp/images/$filename"

    # Use curl for downloading, -s for silent mode, -f for fail on error
    curl -s -f -o /tmp/images/$filename $url or begin echo "Error downloading $url" >&2 end

    set -l target_dir $argv[2]
    cp /tmp/images/$filename $target_dir/$filename
end

# --- Main Logic ---

set markdown_files (string split "\n" (find . -name "*.md"))

# 1. Find all image URLs in Markdown files
set image_urls (grep -oE 'http.*\.(jpg|png)$' $markdown_files)

# 2. Download each image
for url in $image_urls
    download_image $url
    sed -i "s|$url|/tmp/images/$(basename $url)|g" $markdown_files
end

echo "Image download and replacement complete!"

# We want to host all images locally
function download_image
    set -l url $argv[1]
    set -l filename (basename $url)
    set -l target_dir $argv[2]

    echo "Downloading: $url to $target_dir"

    # Use curl for downloading, -s for silent mode, -f for fail on error
    curl -s -f -o $target_dir/$filename $url or begin echo "Error downloading $url" >&2 end
end

# --- Main Logic ---

function main --description 'Download images from Markdown files and replace URLs'
    set -l markdown_files $argv
    set -l script_dir (dirname (status --current-filename))
    set -l images_dir $script_dir/../static/images

    echo "Script dir: $script_dir"
    echo "Images dir: $images_dir"
    echo "Markdown files to sed: $markdown_files"

    # 1. Find all image URLs in Markdown files
    set -l image_urls (grep -oE --no-filename 'http.*\.(jpg|png)' $markdown_files)
    echo "Image URLs: $image_urls"

    # 2. Download each image
    set -l target_dir static/images/posts
    mkdir /tmp/images
    for url in $image_urls
        download_image $url $images_dir/posts
        sed -i '' "s|$url|$target_dir/$(basename $url)|g" $markdown_files
    end

    echo "Image download and replacement complete!"
end

main $argv

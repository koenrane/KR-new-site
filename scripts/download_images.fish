# We want to host all images locally
function download_image
    set -l url $argv[1]
    set -l filename (basename $url)
    set -l target_dir $argv[2]

    echo "Downloading: $url to $target_dir"

    # Use curl for downloading, -s for silent mode, -f for fail on error
    curl -s -f -o "$target_dir/$filename" $url or begin echo "Error downloading $url" >&2 end
end

# --- Main Logic ---

function main --description 'Download images from Markdown files and replace URLs'
    set -l markdown_files $argv
    set -l images_dir quartz/static/images/posts
    set -l target_dir static/images/posts

    # 1. Find all image URLs in Markdown files
    set -l image_urls (command grep -oE --no-filename 'http[^\)]*?\.(jpe?g|png|webp)' $markdown_files)

    # 2. Download each image
    mkdir /tmp/images >/dev/null
    for url in $image_urls
        download_image $url $images_dir

        set -l escaped_url (echo $url | sed 's|[/\\.^$\[\]]|\\&|g')
        echo "Escaped URL: $escaped_url"
        sed -i ''.bak "s|$escaped_url|/$target_dir/$(basename $url)|g" $markdown_files
    end

    echo "Image download and replacement complete!"
end

main $argv

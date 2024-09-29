# We want to host all assets locally
function download_asset
    set -l url $argv[1]
    set -l filename (basename $url)
    set -l target_dir $argv[2]

    echo "Downloading: $filename to $target_dir"

    # Use curl for downloading, -s for silent mode, -f for fail on error
    curl -s -f -o "$target_dir/$filename" $url or begin echo "Error downloading $url" >&2 end
end

# --- Main Logic ---

function main --description 'Download assets from Markdown files and replace URLs'
    set -l markdown_files $argv
    set -l asset_dir quartz/static/images/posts
    set -l target_dir static/images/posts

    # 1. Find all asset URLs in Markdown files
    set -l asset_urls (command grep -oE --no-filename 'http[^\)]*?\.(jpe?g|png|webp|gif|mpeg|avi(?=\))|webm)' $markdown_files)

    # Add in mp4 files which don't start with https://assets.turntrout
    set -l mp4_regex 'http[^\)]*?\.mp4'
    set -l mp4_urls (command grep -oE $mp4_regex $markdown_files | grep -v 'https://assets\.turntrout')
    set -l --append asset_urls $mp4_urls

    # 2. Download each asset
    for url in $asset_urls
        download_asset $url $asset_dir

        set -l escaped_url (echo $url | sed 's|[/\\.^$\[\]]|\\&|g')
        sed -i ''.bak "s|$escaped_url|/$target_dir/$(basename $url)|g" $markdown_files
    end

    set -l cloud_regex 'https?://res\.cloudinary\.com/lesswrong-2-0/image/[^\)]*'
    set -l cloudinary_urls (command grep -oE --no-filename $cloud_regex $markdown_files)
    echo $cloudinary_urls

    for url in $cloudinary_urls
        set -g filename (basename $url)

        download_asset $url $asset_dir
        
        set -l extension (string match -r '\.[^.]+$' $filename)
        if test -z "$extension" # No extension
            set -l file_type (file --mime-type -b $asset_dir/$filename)
            set -l detected_extension (echo $file_type | sed 's|^.*/||')

            mv  "$asset_dir/$filename"  "$asset_dir/$filename.$detected_extension"
            set -g filename "$filename.$detected_extension"
            echo "Downloaded and renamed: $filename"
        end

        set -l escaped_url (echo $url | sed 's|[/\\.^$\[\]]|\\&|g')
        sed -i ''.bak "s|$escaped_url|/$target_dir/$filename|g" $markdown_files
    end

    echo "Asset download and replacement complete!"
end

main $argv

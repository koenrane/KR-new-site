#!/usr/bin/env fish_test

set -l file_dir (dirname (status -f))
source $file_dir/../convert_assets.fish
source $file_dir/utils.fish

set -g CASED_ALLOWED_EXTENSIONS
for ext in $ALLOWED_EXTENSIONS
    set -l all_caps (echo $ext | tr '[:lower:]' '[:upper:]')
    set -g CASED_ALLOWED_EXTENSIONS $CASED_ALLOWED_EXTENSIONS $ext $all_caps
end

function setup
    set -g temp_dir (mktemp -d)
    cd $temp_dir
    trap teardown EXIT

    git init . >/dev/null
    set --export -g GIT_ROOT (pwd)

    # Create test files and directories (simulating project structure)
    mkdir -p quartz/static
    mkdir scripts
    mkdir content

    for image_ext in jpg
        create_test_image quartz/static/image.$image_ext 32
    end
    for video_ext in mp4 mov mkv
        create_test_video quartz/static/video.$video_ext
    end
    touch quartz/static/unsupported.txt

    for file in (ls quartz/static)
        echo "[](static/$file)" >>content/text.md
    end
end

function teardown
    cd -
    command rm -rf $temp_dir
end

@test "converts images to AVIF with correct references" ( 
    setup
    convert_asset quartz/static/image.jpg 

    # Check that the avif file exists and has nonzero size
    if not test -s quartz/static/image.avif
      echo "image.avif does not exist or is empty"
    end

    #echo (cat content/text.md)
    set -l is_edited (cat content/text.md | grep -o "image.avif" | wc -l)
    if not test $is_edited -eq 1
      echo "image.avif is not referenced in text.md"
    end

    echo 0
) = 0

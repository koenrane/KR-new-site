#!/usr/bin/env fish_test

set -l file_dir (dirname (status -f))
source $file_dir/../convert_assets.fish
source $file_dir/utils.fish

set -g IMAGE_EXTENSIONS jpg png jpeg

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

    for ext in $IMAGE_EXTENSIONS
        create_test_image quartz/static/asset.$ext 32
    end
    for ext in $ALLOWED_EXTENSIONS # Video extensions
        create_test_video quartz/static/asset.$ext
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

for ext in $IMAGE_EXTENSIONS
    @test "converts $ext images to AVIF with correct references" ( 
      setup
      convert_asset quartz/static/asset.$ext

      # Check that the avif file exists and has nonzero size
      if not test -s quartz/static/asset.avif
        echo "asset.avif does not exist or is empty"
      end

      set -l is_edited (cat content/text.md | grep -o "asset.avif" | wc -l)
      if not test $is_edited -eq 1
        echo "asset.avif is not referenced in text.md"
      end

      echo 0
  ) = 0
end

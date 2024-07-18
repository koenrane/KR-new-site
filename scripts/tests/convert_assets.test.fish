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
        echo -n "![](quartz/static/asset.$ext)" >>content/image_text.md
    end
    for ext in $VIDEO_EXTENSIONS_TO_CONVERT # Video extensions
        create_test_video quartz/static/asset.$ext
        echo -n "![](quartz/static/asset.$ext)" >>content/$ext.md
        echo -n "[[quartz/static/asset.$ext]]" >>content/$ext.md
        if not test $ext = gif
            echo -n "<video src=\"quartz/static/asset.$ext\" alt=\"shrek\"/>" >>content/$ext.md
        end

    end
    echo -n "<img src=\"quartz/static/asset.gif\" alt=\"shrek\">" >>content/gif.md

    touch quartz/static/unsupported.txt
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

      set -l is_edited (cat content/image_text.md | grep -o "asset.avif" | wc -l)
      if not test $is_edited -eq 1
        echo "asset.avif is not referenced in image_text.md"
      end

      echo 0
  ) = 0
end

# Gif conversion test
set -g target_output '<video autoplay loop muted playsinline src="quartz/static/asset.webm" type="video/webm"><source src="quartz/static/asset.webm"></video>'
set -g target_output_with_alt '<video autoplay loop muted playsinline src="quartz/static/asset.webm" alt="shrek" type="video/webm"><source src="quartz/static/asset.webm"></video>'
set -g repeated_target "$target_output$target_output$target_output_with_alt"
@test "converts GIF files to WebM with correct references" ( 
  setup
  convert_asset quartz/static/asset.gif

  # Check that the webm file exists and has nonzero size
  if not test -s quartz/static/asset.webm
    echo "asset.webm does not exist or is empty"
  end

  set -l output (cat content/gif.md)
  echo $output
) = $repeated_target

set -l target_non_gif '<video src="quartz/static/asset.webm" type="video/webm"/>'
set -l target_non_gif_alt '<video src="quartz/static/asset.webm" type="video/webm" alt="shrek"/>'
for ext in $VIDEO_EXTENSIONS_TO_CONVERT
    if test $ext = gif
        continue
    end
    set -l video_test_output $target_non_gif$target_non_gif$target_non_gif_alt
    @test "converts $ext videos to WebM with correct references" ( 
      setup
      convert_asset quartz/static/asset.$ext

      # Check that the webm file exists and has nonzero size
      if not test -s quartz/static/asset.webm
        echo "asset.webm does not exist or is empty"
      end


  set -l output (cat content/$ext.md)
  echo $output

  ) = $video_test_output
end

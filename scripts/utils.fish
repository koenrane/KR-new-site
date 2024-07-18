set GIT_ROOT (git rev-parse --show-toplevel)

set R2_BASE_URL "https://assets.turntrout.com"
set R2_BUCKET_NAME turntrout

function get_r2_key
    set -l filepath $argv[1]
    string replace -r '.*quartz/' '' $filepath | string replace -r '^/' ''
end

# TODO not yet working or tested 
function find_asset_referencing_files
    find $GIT_ROOT/quartz/{components,plugins/emitters} $GIT_ROOT/content -type f \( -iname "*.ts" -o -iname "*.tsx" -o -iname "*.js" -o -iname "*.jsx" -o -iname "*.scss" -o -iname "*.md" \) ! -iname "*.!*!*" | grep -v ".obsidian"
end

function sanitize_filename
    echo "$argv[1]" | sed -E "s#[\\\$&*.?/|]#\\\&#g"
end

function replace_extension
    set -l input_file $argv[1]
    set -l new_extension $argv[2]
    echo (string replace -r '\.[^.]+$' ".$new_extension" $input_file)
end

function create_test_image
    set -l filename $argv[1]
    set -l size $argv[2]
    magick -size $size xc:white $filename
end

function create_test_video
    set -l filename $argv[1]

    ffmpeg -f lavfi -i rgbtestsrc -t 1 $filename >/dev/null 2>&1
end

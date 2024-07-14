set GIT_ROOT (git rev-parse --show-toplevel)

set R2_BASE_URL "https://assets.turntrout.com"
set R2_BUCKET_NAME turntrout

function get_r2_key
    set -l filepath $argv[1]
    string replace -r '.*quartz/' '' $filepath | string replace -r '^/' ''
end

function find_asset_referencing_files
    find $GIT_ROOT/quartz/{components,plugins/emitters} $GIT_ROOT/content -type f \( -iname "*.ts" -o -iname "*.tsx" -o -iname "*.js" -o -iname "*.jsx" -o -iname "*.scss" -o -iname "*.md" \) ! -iname "*.!*!*" | grep -v ".obsidian"
end

function sanitize_filename
    echo "$argv[1]" | sed -E "s#[\\\$&*.?/|]#\\\&#g"
end

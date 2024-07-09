set GIT_ROOT (git rev-parse --show-toplevel)

set R2_BASE_URL "https://assets.turntrout.com"
set R2_BUCKET_NAME turntrout

function get_r2_key
    set -l filepath $argv[1]
    set -l r2_key (string replace -r '.*quartz/' '' $filepath | string replace -r '^/' '')
    echo $r2_key
end

function find_asset_referencing_files
    find quartz/{components,plugins/emitters} content -type f \( -iname "*.ts" -o -iname "*.tsx" -o -iname "*.js" -o -iname "*.jsx" -o -iname "*.scss" -o -iname "*.md" \) ! -iname "*.!*!*" | grep -v ".obsidian"
end

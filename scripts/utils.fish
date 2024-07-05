set GIT_ROOT (git rev-parse --show-toplevel)

set R2_BASE_URL "https://assets.turntrout.com" # TODO consolidate in one place
set R2_BUCKET_NAME turntrout

function get_r2_key
    set -l filepath $argv[1]
    set -l r2_key (string replace -r '.*quartz/' '' $filepath | string replace -r '^/' '')
    echo $r2_key
end

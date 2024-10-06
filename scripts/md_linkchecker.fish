#!/usr/bin/env fish

function check_md_links
    set -l MD_FILES $argv
    set INVALID_MD_LINK_PATTERN "\]\([-A-Za-z_0-9]+(\\.md)?\)"

    if grep -q -E "$INVALID_MD_LINK_PATTERN" $MD_FILES
        echo "INVALID_MD_LINK: These files probably have invalid markdown URLs"
        grep -E "$INVALID_MD_LINK_PATTERN" $MD_FILES >/dev/stderr
        return 1
    end
    return 0
end

if test (count $argv) -eq 0
    echo "Error: No target files specified"
    exit 1
end

check_md_links $argv
exit $status

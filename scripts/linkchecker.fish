#!/usr/bin/env fish

# If there are no arguments passed, then default to GIT_ROOT's public directory
set -l GIT_ROOT (git rev-parse --show-toplevel)

# Target files for the html linkcheckers
set -l TARGET_FILES $argv
if test -z "$TARGET_FILES"
    set TARGET_FILES $GIT_ROOT/public/**html
end

# Internal links should NEVER 404! Check links which start with a dot or slash
# Use the live server to resolve relative links
if test -z $argv
    set -x no_proxy "http://localhost:8080"
    linkchecker http://localhost:8080 --threads 50 
else
    linkchecker $TARGET_FILES --threads 50 
end

set -l INTERNAL_STATUS $status

# Check external links which I control
linkchecker $TARGET_FILES \
    --ignore-url="!^https://(assets\.turntrout\.com|github\.com/alexander-turner/TurnTrout\.com)" \
    --no-warnings \
    --check-extern \
    --threads 30 \
    --user-agent "linkchecker" \
    --timeout 40 
set -l EXTERNAL_STATUS $status

# If any of the checks failed, exit with a non-zero status
if test $INTERNAL_STATUS -ne 0 -o $EXTERNAL_STATUS -ne 0
    echo "Link checks failed: " >&2
    echo "Internal linkchecker: $INTERNAL_STATUS" >&2
    echo "External linkchecker: $EXTERNAL_STATUS" >&2
    exit 1
end

exit 0

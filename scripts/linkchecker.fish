#!/usr/bin/env fish

# If there are no arguments passed, then default to the GIT_ROOT public
set -l GIT_ROOT (git rev-parse --show-toplevel)

fish "$GIT_ROOT/scripts/md_linkchecker.fish" 
set -l MD_CHECK_STATUS $status

set -l TARGET_FILES $argv

if test -z "$TARGET_FILES"
    set TARGET_FILES $GIT_ROOT/public/**html
end

# Internal links should NEVER 404! Check links which start with a dot or slash
# Use the live server to resolve relative links
linkchecker http://localhost:8080 --threads 20
set -l HTML_CHECK_STATUS_1 $status

# CDN links should never 404
linkchecker $TARGET_FILES --ignore-url="!^https?://assets\.turntrout\.com" --no-warnings --check-extern
set -l HTML_CHECK_STATUS_2 $status

# If any of the checks failed, exit with a non-zero status
if test $MD_CHECK_STATUS -ne 0 -o $HTML_CHECK_STATUS_1 -ne 0 -o $HTML_CHECK_STATUS_2 -ne 0
    exit 1
end

exit 0

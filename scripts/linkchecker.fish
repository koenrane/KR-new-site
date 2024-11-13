#!/usr/bin/env fish

# If there are no arguments passed, then default to GIT_ROOT's public directory
set -l GIT_ROOT (git rev-parse --show-toplevel)

# Target files for the html linkcheckers
set -l TARGET_FILES $argv
if test -z "$TARGET_FILES"
    set TARGET_FILES $GIT_ROOT/public/**html
end

# Internal links should NEVER 404! Check links which start with a dot or slash
# # Use the live server to resolve relative links
# if test -z $argv
#     set -x no_proxy "http://localhost:8080"
#     linkchecker http://localhost:8080 --threads 10 
# else
#     linkchecker $TARGET_FILES --threads 10 
# end

set -l HTML_CHECK_STATUS_1 $status

# Check CDN assets with curl instead of linkchecker
echo "Checking CDN assets..."
set -l cdn_urls (cat $TARGET_FILES | pup 'img[src*="assets.turntrout.com"],link[href*="assets.turntrout.com"] attr{src,href}' | sort -u)
set -l CURL_STATUS 0

for url in $cdn_urls
    curl -sI \
      -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
      -H "Referer: https://turntrout.com/" \
      $url >/dev/null
    if test $status -ne 0
        echo "Error accessing: $url" >&2
        set CURL_STATUS 1
    end
end

# If any of the checks failed, exit with a non-zero status
if test $HTML_CHECK_STATUS_1 -ne 0 -o $CURL_STATUS -ne 0
    echo "Link checks failed: " >&2
    echo "Internal linkchecker: $HTML_CHECK_STATUS_1" >&2
    echo "CDN asset checker: $CURL_STATUS" >&2
    exit 1
end

exit 0

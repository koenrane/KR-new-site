set -l GIT_ROOT $(git rev-parse --show-toplevel)

# So the ignore-url syntax is very confusing. 
#  linkchecker only checks those links which *match* the regex. 
#  So if you want to ignore a link, you need to match it with a regex that doesn't match the link.

# Internal links should NEVER 404!
linkchecker $GIT_ROOT/public/**html --ignore-url="!^\.+.*" --no-warnings

# CDN links should never 404
linkchecker $GIT_ROOT/public/**html --ignore-url="!^https?://assets\.turntrout\.com" --no-warnings --check-extern

#!/usr/bin/env fish

set -l GIT_ROOT (git rev-parse --show-toplevel)
set -l DEFAULT_CSS_FILE "$GIT_ROOT/public/index.css"

# Parse options (currently none defined for the main logic)
argparse --name "check-css-vars" --max-args 1 -- $argv
# `or return` exits if argparse found errors (like unknown options)
or return

# Check if a positional argument (the css file) was provided
set -l css_file
if test -n "$argv"
    set css_file $argv[1]
else
    set css_file $DEFAULT_CSS_FILE
end

# Shiki variables are imported at runtime. 
# "Problems" and "index.css" are other non-empty lines, 
#   even if no errors are found.
set -l IGNORE_PATTERNS 'shiki|problems|public/index.css'

# Run stylelint, filter output (ignoring patterns and empty/whitespace lines), 
# and capture potential errors
set -l errors (npx stylelint "$css_file" \
            --config "$GIT_ROOT/.variables-only-stylelintrc.json" \
            &| grep -vE $IGNORE_PATTERNS \
            | grep .)

# Check if any errors were captured
if test -n "$errors"
    echo "Error: Found unknown CSS variable(s):"

    set -l formatted_errors (npx stylelint "$css_file" \
            --config "$GIT_ROOT/.variables-only-stylelintrc.json" \
            &| grep -vE $IGNORE_PATTERNS)
    echo "$formatted_errors"
    exit 1
end
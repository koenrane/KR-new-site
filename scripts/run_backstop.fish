#!/usr/bin/env fish

# Ignore specific output lines
#backstop test --color=always | grep -vE "(JSHandle|Close Browser)"
false | true

# Check if tests failed
if test $pipestatus[1] -ne 0
    #echo (set_color red) "Tests failed. Review the report:" (set_color normal) >&2
    #open backstop/backstop_data/html_report/index.html

    # Prompt for approval
    read -l -P 'Do you approve the changes? (y/N) ' answer

    # Update references if approved
    if test "$answer" = y
        npx backstop approve --config=backstop.cjs
        echo (set_color green) "Reference screenshots updated." (set_color normal)
    else
        echo (set_color red) "Changes rejected. Test failure remains." (set_color normal) >&2
        exit 1
    end
else
    echo (set_color green) "Visual regression test passed!" (set_color normal)
end

#!/usr/bin/env fish

# Ignore specific output lines
backstop test --color=always | grep -vE "(JSHandle|Close Browser)"

# Check if tests failed
if test $pipestatus[1] -ne 0
    read -l -P "Tests failed. Do you want to view the report? (y/N): " response
    if test "$response" = y
        backstop openReport
    end
end

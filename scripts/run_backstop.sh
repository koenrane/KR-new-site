#!/bin/sh

# Ignore specific output lines (using grep -v)
npx backstop test --config="backstop.cjs" --color=always | grep -vE "(JSHandle|Close Browser)"

# Check the exit status of the backstop command
if [ ${PIPESTATUS[0]} -ne 0 ]; then
	# Use ANSI escape codes for colors
	echo -e "\033[31mTests failed. Review the report:\033[0m" >&2
	open backstop/backstop_data/html_report/index.html

	# Prompt for approval (with a default answer 'N')
	read -r -p 'Do you approve the changes? (y/N) ' answer
	answer="${answer:-N}" # Set answer to 'N' if it's empty

	# Update references if approved
	if [ "$answer" = "y" ]; then
		npx backstop approve --config=backstop.cjs
		echo -e "\033[32mReference screenshots updated.\033[0m"
	else
		echo -e "\033[31mChanges rejected. Test failure remains.\033[0m" >&2
		exit 1 # Use 'exit 1' to signal a failure in Bash
	fi
else
	echo -e "\033[32mVisual regression test passed!\033[0m"
fi

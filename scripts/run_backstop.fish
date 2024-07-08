#!/bin/bash

# Ignore spam outputs
backstop test --color=always | grep -vE "(JSHandle|Close Browser)"

# Capture the exit status of the backstop test
test_status=$?

# Check if the tests failed
if [ $test_status -ne 0 ]; then
	read -p "Tests failed. Do you want to view the report? (y/N): " response
	if [ "$response" == "y" ]; then
		backstop openReport
	fi
fi

#!/bin/bash

# Function to prompt user for input
prompt_for_input() {
	local prompt_message=$1
	local user_input
	read -p "$prompt_message: " user_input
	echo "$user_input"
}

# Get the scenario label from the user
scenario_label=$(prompt_for_input "Enter the scenario label")

# Get the scenario URL from the user
scenario_url=$(prompt_for_input "Enter the scenario URL")

# Call the Node.js script with the user inputs
node addScenario.cjs "$scenario_label" "$scenario_url"

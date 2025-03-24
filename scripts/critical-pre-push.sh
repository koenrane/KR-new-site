#!/bin/bash

GIT_ROOT=$(git rev-parse --show-toplevel)
cd "$GIT_ROOT" || exit

python "$GIT_ROOT"/scripts/update_date_on_publish.py
echo "Updated date on publish."

# If there are any changes, commit
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A && git commit -m "Update publication dates"
fi

# Finally, timestamp the final commit
sh "$GIT_ROOT"/scripts/timestamp_last_commit.sh
echo "Timestamped last commit."

exit 0

GIT_ROOT=$(git rev-parse --show-toplevel)
cd "$GIT_ROOT"

python "$GIT_ROOT"/scripts/update_date_on_publish.py
echo "Updated date on publish."

# Finally, timestamp the final commit
sh "$GIT_ROOT"/scripts/timestamp_last_commit.sh
echo "Timestamped last commit."

exit 0

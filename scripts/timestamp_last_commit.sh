#!/bin/sh

COMMIT_RANGE=$(git rev-list @{upstream}..HEAD)
COMBINED_HASHES=$(echo "$COMMIT_RANGE" | tr '\n' ' ')
FINAL_HASH=$(echo "$COMBINED_HASHES" | sha256sum | cut -d ' ' -f 1)
TIMESTAMP_OUTPUT=$(timestamp "$FINAL_HASH")

# Store the original commit message
ORIGINAL_MSG=$(git log -1 --pretty=%B)

# Construct the new commit message
NEW_MSG=$(
  cat <<EOF
${ORIGINAL_MSG}

Timestamped upon push.

Commit range: ${COMMIT_RANGE}
Final hash: ${FINAL_HASH}
Timestamp output: ${TIMESTAMP_OUTPUT}
EOF
)

# Amend the commit with the new message
git commit --amend -m "$NEW_MSG"

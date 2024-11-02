#!/bin/bash
set -euo pipefail

# loop over input targets, hash them whether file or string, and submit:
for TARGET in "$@"; do
  if [ -f "$TARGET" ]; then
    # since it's a valid file, tell `sha256sum` to read it and hash it:
    HASH=$(sha256sum "$TARGET" | cut -d ' ' -f 1)
  else # if it's a string we're precommitting to instead, pipe it into `sha256sum`:
    HASH=$(echo "$TARGET" | sha256sum | cut -d ' ' -f 1)
  fi

  echo -n "$TARGET: "
  curl -X POST "http://api.originstamp.com/v4/timestamp/create" \
    -H "Content-Type: application/json" \
    -H "Authorization: $ORIGINSTAMP_API_KEY" \
    -d "{\"comment\": \"test\", \"hash\": \"$HASH\"}"

  # print newline to keep output tidier since curl doesn't add a final newline to the JSON output
  echo
done

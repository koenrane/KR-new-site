#!/bin/bash

set file $argv[1]
# Footnote invocation replacement (from LW format)
# Matches eg [[16]](fdsav)        ->  [^16]
sed -E 's/\[\[([^\]]*)\]\].*\)/\[\^\1\]/g' $file >$file.tmp && mv $file.tmp $file
echo "1"

# Footnote content replacement (from LW format)
#               16. **(garbage)** -> [^16]:
perl -pe 's/([0-9]+)\. \*\*.*\)\*\*/\[\^\1\]: /g' $file >$file.tmp && mv $file.tmp $file
# TODO there are two extra newlines still, but apparently obsidian doesn't care.

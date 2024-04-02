#!/bin/bash

set file $argv[1]
# Footnote invocation replacement (from LW format)
# Matches eg [[16]](fdsav)        ->  [^16]
sed -E 's/\[\[([^\]]*)\]\].*\)/\[\^\1\]/g' $file >$file.tmp && mv $file.tmp $file
echo "1"

# Include trailing punctuation in MD links so that favicons look good
#                 [link text](url). -> [link text.](url)
# sed -i '' -E 's/\[(?<linkText>.*)\]\((?<url>.*)\)(?<punctuation>[\"\`\)\]\}\.\,\?\!]+)/\[\k<linkText>\k<punctuation>\]\(\k<url>\)/g' $file
perl -pe 's/([\(\”\“\"\[]*)\[([^\]]+)\]\([^#](.*?)\)([\”\"\`\)\”\]\}\.\,\?:\!”]+)\s/\[$1$2$4\]\($3\)/gm;t' $file >$file.tmp && mv $file.tmp $file

# Footnote content replacement (from LW format)
#               16. **(garbage)** -> [^16]:
perl -pe 's/([0-9]+)\. \*\*.*\)\*\*/\[\^\1\]: /g' $file >$file.tmp && mv $file.tmp $file
# TODO there are two extra newlines still, but apparently obsidian doesn't care.

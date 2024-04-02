#!/usr/bin/fish

set file $argv[0]
# Footnote invocation replacement (from LW format)
# Matches eg [[16]](fdsav)        ->  [^16]
sed -i '' -E 's/\[\[([^]]*)\]\].*\)/\[\^\1\]/g' $file

# Include trailing punctuation in MD links so that favicons look good
#                 [link text](url). -> [link text.](url)
# sed -i '' -E 's/\[(?<linkText>.*)\]\((?<url>.*)\)(?<punctuation>[\"\`\)\]\}\.\,\?\!]+)/\[\k<linkText>\k<punctuation>\]\(\k<url>\)/g' $file
perl -pe 's/([\(\”\“\"\[]*)\[([^\]]+)\]\([^#](.*?)\)([\”\"\`\)\”\]\}\.\,\?:\!”]+)\s/\[$1$2$4\]\($3\)/gm;t' $file

# Footnote content replacement (from LW format)
#               16. **(garbage)** -> [^16]:
sed -i '' -E 's/([0-9]+)\. \*\*.*\)\*\*/\[\^\1\]: /g' $file
# TODO there are two extra newlines still, but apparently obsidian doesn't care.

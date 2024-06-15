set -l GIT_ROOT (git rev-parse --show-toplevel) # Get the root of the git repository
set -l GIF_FILES (find $GIT_ROOT/{content,quartz/static} -name '*.gif') # Find all GIF files in the repository
set -l REFERENCES_TO_REPLACE $GIT_ROOT/{content/**md,quartz/**.tsx}

for file in $GIF_FILES
    set -l file_name_no_ext (string replace -r '\.gif$' '' $file)

    # First Pass (Analysis)
    ffmpeg -i "$file" -n -c:v libvpx-vp9 -crf 23 -b:v 800k -pass 1 -loglevel error -an -f null /dev/null

    # Second Pass (Encoding with Optimized Bit Allocation)
    ffmpeg -i "$file" -n -c:v libvpx-vp9 -crf 23 -b:v 800k -pass 2 -auto-alt-ref 1 -lag-in-frames 25 -row-mt 1 -movflags faststart -vf scale=-2:720 -loglevel error -an "$file_name_no_ext.webm"

    set -l base (basename "$file")
    echo $base
    set -l base_name_no_ext (string replace -r '\.gif$' '' $base)

    # Write the substitution command to the script
    for ref_file in $REFERENCES_TO_REPLACE
        sed -i "" 's|<img src={?"\([^\"]+\)\.gif"}?\([^>]*\)>|<video autoplay loop muted playsinline><source src="\1.webm" \2 type="video/webm"></video>|g' $ref_file
    end


    echo "Converted $file to $file_name_no_ext.webm"
end

# Will then automatically be uploaded to R2 by the upcoming build step

GIT_ROOT=$(git rev-parse --show-toplevel)
find "$GIT_ROOT/quartz/static" -type f \( -name "*.ico" -o -name "*.svg" -o -name "*.avif" -o -name "*.webm" \) -exec fish "$GIT_ROOT/scripts/upload_to_r2.fish" {} \; #--remove_originals {} \;

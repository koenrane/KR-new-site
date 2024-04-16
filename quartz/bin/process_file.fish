set -l file $argv[1]

fish download_images.fish $file
bash convert_footnotes.sh $file

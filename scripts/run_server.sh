#!/bin/bash
set -e # Exit on error

cd "$HOME"/Downloads/turntrout.com

# Ensure that all assets are compressed and converted
sh scripts/convert_assets.sh --remove_originals --strip_metadata

npx quartz build --serve
cd -

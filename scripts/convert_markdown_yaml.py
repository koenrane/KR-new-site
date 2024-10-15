#!/usr/bin/env python3
import argparse
from pathlib import Path
import re
import os
import yaml
import requests
from urllib.parse import urlparse
import shutil
import tempfile
import subprocess

try:
    from . import r2_upload
    from . import utils as script_utils
except ImportError:
    import r2_upload  # type: ignore
    import utils as script_utils  # type: ignore


def process_card_image_in_markdown(md_file: Path) -> None:
    """
    Processes the 'card_image' in the YAML frontmatter of the given markdown file.

    If the 'card_image' ends with '.avif', it downloads the image,
    converts it to PNG using ffmpeg, updates the 'card_image' value,
    and uploads the new image to R2.
    """
    with open(md_file, "r", encoding="utf-8") as file:
        content = file.read()

    # Extract YAML front matter
    match = re.match(r"^---\n(.*?)\n---\n(.*)", content, re.DOTALL)
    if not match:
        print(f"No YAML front matter found in {md_file}. Skipping.")
        return

    yaml_content, md_body = match.groups()
    data = yaml.safe_load(yaml_content)

    card_image_url = data.get("card_image")
    if not card_image_url:
        # print(f"No 'card_image' found in {md_file}. Skipping.")
        return

    if not card_image_url.endswith(".avif"):
        # print(f"'card_image' in {md_file} is not an AVIF image. Skipping.")
        return

    # Download the card_image
    parsed_url = urlparse(card_image_url)
    card_image_filename = os.path.basename(parsed_url.path)

    # Download to a temporary directory
    temp_dir = Path(tempfile.gettempdir())
    avif_path = temp_dir / card_image_filename

    response = requests.get(card_image_url, stream=True)
    if response.status_code == 200:
        with open(avif_path, "wb") as out_file:
            shutil.copyfileobj(response.raw, out_file)
    else:
        raise ValueError(f"Failed to download image: {card_image_url}")

    # Convert AVIF to PNG using ImageMagick
    png_filename = avif_path.with_suffix(".png").name
    png_path = avif_path.with_suffix(".png")

    subprocess.run(
        [
            "magick",
            str(avif_path),
            "-strip",
            "-define",
            "png:compression-level=9",
            "-define",
            "png:compression-filter=5",
            "-define",
            "png:compression-strategy=1",
            "-colors",
            "256",
            str(png_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    git_root = script_utils.get_git_root()
    if git_root is None:
        raise RuntimeError("Could not determine git root")

    static_images_dir = git_root / "quartz" / "static" / "images" / "card_images"
    static_images_dir.mkdir(parents=True, exist_ok=True)
    local_png_path = static_images_dir / png_filename
    shutil.move(str(png_path), str(local_png_path))

    # Upload the new PNG to R2
    r2_upload.upload_and_move(
        local_png_path,
        verbose=True,
        replacement_dir=None,  # Not replacing references in markdown files
        move_to_dir=r2_upload.R2_MEDIA_DIR,
    )

    # Update the 'card_image' value in the YAML frontmatter
    r2_base_url = r2_upload.R2_BASE_URL
    r2_key = r2_upload.get_r2_key(script_utils.path_relative_to_quartz(local_png_path))
    new_card_image_url = f"{r2_base_url}/{r2_key}"

    data["card_image"] = new_card_image_url

    # Write the updated content back to the markdown file
    updated_yaml = yaml.dump(data, allow_unicode=True, sort_keys=False)
    updated_content = f"---\n{updated_yaml}---\n{md_body}"

    with open(md_file, "w", encoding="utf-8") as file:
        file.write(updated_content)

    print(f"Updated 'card_image' in {md_file}")


def main():
    git_root = script_utils.get_git_root()
    if git_root is None:
        raise RuntimeError("Could not determine git root")

    parser = argparse.ArgumentParser(
        description="Convert card images in markdown YAML frontmatter."
    )
    parser.add_argument(
        "-d",
        "--markdown-directory",
        help="Directory containing markdown files to process",
        default=git_root / "content",
    )
    args = parser.parse_args()

    markdown_dir = Path(args.markdown_directory)
    markdown_files = script_utils.get_files(
        dir_to_search=markdown_dir,
        filetypes_to_match=(".md",),
    )

    for md_file in markdown_files:
        process_card_image_in_markdown(md_file)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import argparse
from typing import Optional
import subprocess
from pathlib import Path
import re
import os
import yaml
import requests
from urllib.parse import urlparse
import shutil
import tempfile

try:
    from . import compress
    from . import r2_upload
    from . import utils as script_utils
except ImportError:
    import compress  # type: ignore
    import r2_upload  # type: ignore
    import utils as script_utils  # type: ignore


def _video_patterns(input_file: Path) -> tuple[str, str]:
    """Returns the original and replacement patterns for video files."""
    # Function to create unique named capture groups for different link patterns
    link_pattern_fn = lambda tag: rf"(?P<link_{tag}>[^\)]*)"

    # Pattern for markdown image syntax: ![](link)
    parens_pattern: str = (
        rf"\!?\[\]\({link_pattern_fn('parens')}{input_file.stem}\{input_file.suffix}\)"
    )

    # Pattern for wiki-link syntax: [[link]]
    brackets_pattern: str = (
        rf"\!?\[\[{link_pattern_fn('brackets')}{input_file.stem}\{input_file.suffix}\]\]"
    )

    # Link pattern for HTML tags
    tag_link_pattern: str = link_pattern_fn("tag")

    if input_file.suffix == ".gif":
        # Pattern for <img> tags (used for GIFs)
        tag_pattern: str = (
            rf'<img (?P<earlyTagInfo>[^>]*)src="{tag_link_pattern}{input_file.stem}\.gif"(?P<tagInfo>[^>]*)(?P<endVideoTagInfo>)/?>'
        )
    else:
        # Pattern for <video> tags (used for other video formats)
        tag_pattern = (
            rf'<video (?P<earlyTagInfo>[^>]*)src="{tag_link_pattern}{input_file.stem}{input_file.suffix}"'
            rf'(?P<tagInfo>[^>]*)(?:type="video/{input_file.suffix[1:]}")?(?P<endVideoTagInfo>[^>]*(?=/))/?>'
        )

    # Combine all patterns into one, separated by '|' (OR)
    original_pattern: str = rf"{parens_pattern}|{brackets_pattern}|{tag_pattern}"

    # Combine all possible link capture groups
    all_links = r"\g<link_parens>\g<link_brackets>\g<link_tag>"

    # Convert to .mp4 video
    video_tags: str = (
        "autoplay loop muted playsinline " if input_file.suffix == ".gif" else ""
    )
    replacement_pattern: str = (
        rf'<video {video_tags}src="{all_links}{input_file.stem}.mp4"\g<earlyTagInfo>\g<tagInfo> type="video/mp4"\g<endVideoTagInfo>><source src="{all_links}{input_file.stem}.mp4" type="video/mp4"></video>'
    )

    return original_pattern, replacement_pattern


def convert_asset(
    input_file: Path,
    remove_originals: bool = False,
    strip_metadata: bool = False,
    md_replacement_dir: Optional[Path] = Path("content/"),
) -> None:
    """
    Converts an image or video to a more efficient format. Replaces
    references in markdown files.

    Args:
        input_file: The path to the file to convert.
        remove_originals: Whether to remove the original file.
        strip_metadata: Whether to strip metadata from the converted
        file.
        replacement_dir: The directory to search for markdown files
    Side-effects:
        - Converts the input file to a more efficient format.
        - Replaces references to the input file in markdown files,
          assuming they start with static/.
        - Optionally removes the original file.
        - Optionally strips metadata from the converted file.
    Errors:
        - FileNotFoundError: If the input file does not exist.
        - NotADirectoryError: If the replacement directory does not exist.
        - ValueError: If the input file is not an image or video.
    """

    if not input_file.is_file():
        raise FileNotFoundError(f"Error: File '{input_file}' not found.")

    if md_replacement_dir and not md_replacement_dir.is_dir():
        raise NotADirectoryError(f"Error: Directory '{md_replacement_dir}' not found.")

    relative_path = script_utils.path_relative_to_quartz(input_file)

    # The file to search for in markdown files
    pattern_file = relative_path.relative_to("quartz")
    output_file: Path = pattern_file.with_suffix(".avif")

    if input_file.suffix in compress.ALLOWED_IMAGE_EXTENSIONS:
        compress.image(input_file)
        original_pattern = rf"(?:\./)?{re.escape(str(pattern_file))}"
        replacement_pattern = str(output_file)

    elif input_file.suffix in compress.ALLOWED_VIDEO_EXTENSIONS:
        output_file = input_file.with_suffix(".mp4")
        compress.to_hevc_video(input_file)

        original_pattern, replacement_pattern = _video_patterns(input_file)

    else:
        raise ValueError(f"Error: Unsupported file type '{input_file.suffix}'.")

    for md_file in script_utils.get_files(
        dir_to_search=md_replacement_dir, filetypes_to_match=(".md",)
    ):
        with open(md_file, "r", encoding="utf-8") as file:
            content = file.read()
        content = re.sub(original_pattern, replacement_pattern, content)

        # Add a second pass to handle the </video><br/>Figure: pattern
        content = re.sub(
            r"</video>\s*(<br/?>)?\s*Figure:", "</video>\n\nFigure:", content
        )

        with open(md_file, "w", encoding="utf-8") as file:
            file.write(content)

    if strip_metadata:
        subprocess.run(
            ["exiftool", "-all=", str(output_file), "--verbose"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,  # Apparently info still gets removed so OK to not check?
        )

    if remove_originals and input_file.suffix not in (".mp4", ".avif"):
        input_file.unlink()


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

    # Move the PNG file to the static images directory
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
    parser = argparse.ArgumentParser(description="Convert assets to optimized formats.")
    parser.add_argument(
        "-r",
        "--remove-originals",
        action="store_true",
        help="Remove original files after conversion",
    )
    parser.add_argument(
        "-s",
        "--strip-metadata",
        action="store_true",
        help="Strip metadata from converted files",
    )
    parser.add_argument(
        "-d",
        "--asset-directory",
        help="Directory containing assets to convert",
    )
    parser.add_argument(
        "--ignore-files", nargs="+", help="List of files to ignore during conversion"
    )
    args = parser.parse_args()
    args.asset_directory = Path(args.asset_directory) if args.asset_directory else None

    assets = script_utils.get_files(
        dir_to_search=args.asset_directory,
        filetypes_to_match=compress.ALLOWED_EXTENSIONS,
    )

    for asset in assets:
        if args.ignore_files and asset.name in args.ignore_files:
            print(f"Ignoring file: {asset}")
            continue
        convert_asset(
            asset,
            remove_originals=args.remove_originals,
            strip_metadata=args.strip_metadata,
            md_replacement_dir=Path("content/"),
        )
        process_card_image_in_markdown(asset)


if __name__ == "__main__":
    main()

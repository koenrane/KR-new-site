#!/usr/bin/env python3
import argparse
from typing import Optional
import subprocess
from pathlib import Path
import re

try:
    from . import compress
    from . import utils as script_utils
except ImportError:
    import compress
    import utils as script_utils


def _video_patterns(input_file: Path) -> tuple[str, str]:
    """Returns the original and replacement patterns for video files."""
    # Function to create unique named capture groups for different link patterns
    link_pattern_fn = lambda tag: rf"(?P<link_{tag}>[^\)]*)"

    # Pattern for markdown image syntax: ![](link)
    parens_pattern: str = (
        rf"\!?\[\]\({link_pattern_fn('parens')}{input_file.stem}{input_file.suffix}\)"
    )

    # Pattern for wiki-link syntax: [[link]]
    brackets_pattern: str = (
        rf"\!?\[\[{link_pattern_fn('brackets')}{input_file.stem}{input_file.suffix}\]\]"
    )

    # Link pattern for HTML tags
    tag_link_pattern: str = link_pattern_fn("tag")

    if input_file.suffix == ".gif":
        # Pattern for <img> tags (used for GIFs)
        tag_pattern: str = (
            rf'<img (?P<earlyTagInfo>[^>]*)src="{tag_link_pattern}{input_file.stem}\.gif"(?P<tagInfo>[^>]*)\/?>'
        )
    else:
        # Pattern for <video> tags (used for other video formats)
        tag_pattern: str = (
            rf"<video (?P<earlyTagInfo>[^>]*)src=\"{tag_link_pattern}{input_file.stem}{input_file.suffix}\"(?P<tagInfo>.*)(?:type=\"video/{input_file.suffix}\")?(?P<endVideoTagInfo>[^>]*(?=/))\/?>"
        )

    # Combine all patterns into one, separated by '|' (OR)
    original_pattern: str = (
        rf"{parens_pattern}|{brackets_pattern}|{tag_pattern}"
    )

    # Combine all possible link capture groups
    all_links = r"\g<link_parens>\g<link_brackets>\g<link_tag>"

    # Convert to .webm video
    video_tags: str = (
        "autoplay loop muted playsinline "
        if input_file.suffix == ".gif"
        else ""
    )
    replacement_pattern: str = (
        rf'<video {video_tags}src="{all_links}{input_file.stem}.webm"\g<earlyTagInfo>\g<tagInfo> type="video/webm"><source src="{all_links}{input_file.stem}.webm" type="video/webm"></video>'
    )

    return original_pattern, replacement_pattern


def convert_asset(
    input_file: Path,
    remove_originals: bool = False,
    strip_metadata: bool = False,
    replacement_dir: Optional[Path] = None,
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
        - Replaces references to the input file in markdown files.
        - Optionally removes the original file.
        - Optionally strips metadata from the converted file.
    Errors:
        - FileNotFoundError: If the input file does not exist.
        - NotADirectoryError: If the replacement directory does not exist.
        - ValueError: If the input file is not an image or video.
    """

    if not input_file.is_file():
        raise FileNotFoundError(f"Error: File '{input_file}' not found.")

    if replacement_dir and not replacement_dir.is_dir():
        raise NotADirectoryError(
            f"Error: Directory '{replacement_dir}' not found."
        )

    relative_path: Path = script_utils.path_relative_to_quartz(input_file)
    output_file: Path = relative_path.with_suffix(".avif")

    if input_file.suffix in compress.ALLOWED_IMAGE_EXTENSIONS:
        compress.image(input_file)
        original_pattern = re.escape(str(input_file))
        replacement_pattern = str(input_file.with_suffix(".avif"))

    elif input_file.suffix in compress.ALLOWED_VIDEO_EXTENSIONS:
        output_file = input_file.with_suffix(".webm")
        compress.video(input_file)

        original_pattern, replacement_pattern = _video_patterns(input_file)

    else:
        raise ValueError(
            f"Error: Unsupported file type '{input_file.suffix}'."
        )

    for md_file in script_utils.get_files(
        replacement_dir, filetypes_to_match=(".md",)
    ):
        with open(md_file, "r", encoding="utf-8") as file:
            content = file.read()
        content = re.sub(original_pattern, replacement_pattern, content)
        with open(md_file, "w", encoding="utf-8") as file:
            file.write(content)

    if strip_metadata:
        subprocess.run(
            ["exiftool", "-all=", str(output_file), "--verbose"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,  # Apparently info still gets removed so OK to not check?
        )

    if remove_originals:
        input_file.unlink()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
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
        "--dir-to-search",
        help="Directory to search for markdown files",
    )
    args = parser.parse_args()
    args.dir_to_search = (
        Path(args.dir_to_search) if args.dir_to_search else None
    )

    for asset in script_utils.get_files(
        dir_to_search=args.dir_to_search,
        filetypes_to_match=compress.ALLOWED_EXTENSIONS,
    ):
        print(asset)
        convert_asset(asset, args.remove_originals, args.strip_metadata)

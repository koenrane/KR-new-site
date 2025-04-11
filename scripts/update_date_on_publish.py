"""
Update the publish and update dates in markdown files.
"""

import io
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from ruamel.yaml import YAML
from ruamel.yaml.timestamp import TimeStamp

# Ensure the parent directory is in the sys path so we can import utils
sys.path.append(str(Path(__file__).parent.parent))
# pylint: disable=wrong-import-position
import scripts.utils as script_utils

yaml_parser = YAML(typ="rt")  # Use Round-Trip to preserve formatting
yaml_parser.preserve_quotes = True  # Preserve existing quotes
yaml_parser.indent(mapping=2, sequence=2, offset=2)

now = datetime.now()
current_date = TimeStamp(
    now.year,
    now.month,
    now.day,
    now.hour,
    now.minute,
    now.second,
    now.microsecond,
)


def is_file_modified(file_path: Path) -> bool:
    """
    Check if file has unpushed changes in git.

    Args:
        file_path (Path): Path to the file to check

    Returns:
        bool: True if file has unpushed changes, False otherwise
    """
    try:
        # Get the relative path from git root
        git_root = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"], text=True
        ).strip()
        rel_path = file_path.resolve().relative_to(Path(git_root))

        # Check for unpushed changes
        result = subprocess.check_output(
            ["git", "diff", "--name-only", "origin/main..HEAD", str(rel_path)],
            text=True,
        ).strip()

        return bool(result)
    except subprocess.CalledProcessError:
        print(f"Warning: Could not check git status for {file_path}")
        return False


def maybe_convert_to_timestamp(
    raw_timestamp_info: str | datetime | TimeStamp,
) -> TimeStamp:
    """
    Convert various date formats to TimeStamp.
    """
    if isinstance(raw_timestamp_info, TimeStamp):
        return raw_timestamp_info

    if isinstance(raw_timestamp_info, str):
        # Non-ISO is ambiguous; do not catch errors for that
        dt = datetime.fromisoformat(raw_timestamp_info)
    elif isinstance(raw_timestamp_info, datetime):
        dt = raw_timestamp_info
    else:
        raise ValueError(f"Unknown date type {type(raw_timestamp_info)}")

    return TimeStamp(
        dt.year,
        dt.month,
        dt.day,
        dt.hour,
        dt.minute,
        dt.second,
        dt.microsecond,
    )


def update_publish_date(yaml_metadata: dict) -> None:
    """
    Update publish and update dates in a markdown file's frontmatter.
    """
    # If date_published doesn't exist or is empty/None, create it
    if not yaml_metadata.get("date_published"):
        yaml_metadata["date_published"] = current_date
        yaml_metadata["date_updated"] = current_date
        return

    if "date_updated" not in yaml_metadata:
        yaml_metadata["date_updated"] = yaml_metadata["date_published"]


def write_to_yaml(file_path: Path, metadata: dict, content: str) -> None:
    """
    Write updated metadata to a markdown file.
    """
    # Use StringIO to capture the YAML dump with preserved formatting
    stream = io.StringIO()
    yaml_parser.dump(metadata, stream)
    updated_yaml = stream.getvalue()

    # Write back to file if changes were made
    with file_path.open("w", encoding="utf-8") as f:
        f.write("---\n")
        f.write(updated_yaml)
        f.write("---\n")
        f.write(content)


def main(content_dir: Path | None = None) -> None:
    """
    Main function to update dates in markdown files.

    Args:
        content_dir (Path, optional): Directory containing markdown files.
            Defaults to "content" in current directory.
    """
    if content_dir is None:
        content_dir = Path("content")

    for md_file_path in content_dir.glob("*.md"):
        metadata, content = script_utils.split_yaml(md_file_path)
        if not metadata and not content:
            continue
        original_metadata = metadata.copy()

        # If the file has never been marked as published, set the publish date
        update_publish_date(metadata)

        # # Check for unpushed changes and update date_updated if needed
        if is_file_modified(md_file_path):
            metadata["date_updated"] = current_date

        # Ensure that date fields are timestamps
        for key in ("date_published", "date_updated"):
            metadata[key] = maybe_convert_to_timestamp(metadata[key])

        if metadata != original_metadata:
            print(f"Updated date information on {md_file_path}")
            write_to_yaml(md_file_path, metadata, content)


if __name__ == "__main__":
    main()

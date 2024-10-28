import os
from datetime import datetime
from typing import Tuple
import yaml
import glob
from pathlib import Path
import subprocess
from ruamel.yaml import YAML
import io

yaml_parser = YAML(typ="rt")  # Use Round-Trip to preserve formatting
yaml_parser.preserve_quotes = True  # Preserve existing quotes
yaml_parser.indent(mapping=2, sequence=2, offset=2)

current_date = datetime.now().strftime("%m/%d/%Y")


def is_file_modified(file_path: Path) -> bool:
    """Check if file has unpushed changes in git.

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


def split_yaml(file_path: Path) -> Tuple[dict, str]:
    with file_path.open("r", encoding="utf-8") as f:
        content = f.read()

    # Split frontmatter and content
    parts = content.split("---", 2)
    if len(parts) < 3:
        print(f"Skipping {file_path}: No valid frontmatter found")
        return {}, ""

    # Parse YAML frontmatter using ruamel.yaml instead of PyYAML
    try:
        metadata = yaml_parser.load(parts[1])
        if not metadata:
            metadata = {}
    except Exception as e:
        print(f"Error parsing YAML in {file_path}: {str(e)}")
        return {}, ""

    return metadata, parts[2]


def update_publish_date(yaml_metadata: dict) -> None:
    """Update publish and update dates in a markdown file's frontmatter.

    Args:
        yaml_metadata
    """
    # If date_published doesn't exist, create it and set date_updated to match
    if "date_published" not in yaml_metadata or not yaml_metadata["date_published"]:
        yaml_metadata["date_published"] = current_date
        yaml_metadata["date_updated"] = current_date


def write_to_yaml(file_path: Path, metadata: dict, content: str) -> None:
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
    print(f"Updated date information on {file_path}")


def main(content_dir: Path | None = None) -> None:
    """Main function to update dates in markdown files.

    Args:
        content_dir (Path, optional): Directory containing markdown files.
            Defaults to "content" in current directory.
    """
    if content_dir is None:
        content_dir = Path("content")

    for md_file_path in content_dir.glob("*.md"):
        metadata, content = split_yaml(md_file_path)
        if not metadata and not content:
            continue

        # If the file has never been marked as published, set the publish date
        update_publish_date(metadata)

        # Check for unpushed changes and update date_updated if needed
        if is_file_modified(md_file_path):
            metadata["date_updated"] = current_date
        # if "date_updated" not in metadata:
        #     metadata["date_updated"] = metadata["date_published"]
        #     if "lw-last-modification" in metadata:
        #         metadata["date_updated"] =

        write_to_yaml(md_file_path, metadata, content)


if __name__ == "__main__":
    main()

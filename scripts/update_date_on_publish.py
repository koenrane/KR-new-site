import os
from datetime import datetime
import yaml
import glob
from pathlib import Path


def update_publish_date(file_path: Path):
    """Update publish date in a single markdown file's frontmatter.

    Args:
        file_path (Path): Path to the markdown file to update
    """
    # Read the file
    with file_path.open("r", encoding="utf-8") as f:
        content = f.read()

    # Split frontmatter and content
    parts = content.split("---", 2)
    if len(parts) < 3:
        print(f"Skipping {file_path}: No valid frontmatter found")
        return

    # Parse YAML frontmatter
    try:
        metadata = yaml.safe_load(parts[1])
        if not metadata:
            metadata = {}
    except yaml.YAMLError as e:
        print(f"Error parsing YAML in {file_path}: {str(e)}")
        raise

    # Check if date_published exists and is empty or missing
    if "date_published" not in metadata or not metadata["date_published"]:
        # Set current date in MM/DD/YYYY format
        current_date = datetime.now().strftime("%m/%d/%Y")
        metadata["date_published"] = current_date

        # Write back to file
        with file_path.open("w", encoding="utf-8") as f:
            f.write("---\n")
            f.write(yaml.dump(metadata, sort_keys=False, allow_unicode=True))
            f.write("---\n")
            f.write(parts[2])
        print(f"Updated {file_path} with publish date: {current_date}")


if __name__ == "__main__":
    content_dir = Path("content")
    for md_file in content_dir.glob("*.md"):
        update_publish_date(md_file)

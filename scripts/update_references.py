import argparse
import re
from pathlib import Path


def update_references(
    original_path: Path, target_path: Path, content_dir: Path
) -> None:
    """Updates references to a source file with a new target path in markdown files.

    Args:
        source_path: The path of the file to be replaced.
        target_path: The new path to replace the old references with.
        content_dir: The directory containing the markdown files to search.
    """
    if not content_dir.is_dir():
        raise NotADirectoryError(
            f"Error: Directory '{content_dir}' not found."
        )

    sanitized_original_path, sanitized_target_path = (
        re.escape(str(path)) for path in (original_path, target_path)
    )

    markdown_files = content_dir.glob("**/*.md")

    for file_path in markdown_files:
        update_references_in_file(
            file_path, sanitized_original_path, sanitized_target_path
        )


def update_references_in_file(
    file_path: Path, old_ref: str, new_ref: str
) -> None:
    """Updates references in a single markdown file.

    Args:
        file_path: The path to the markdown file.
        old_ref: The old reference to be replaced.
        new_ref: The new reference to replace the old one.
    """
    with open(file_path, "r") as file:
        content: str = file.read()

    new_content: str = re.sub(old_ref, new_ref, content)

    with open(file_path, "w") as file:
        file.write(new_content)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Update references in markdown files."
    )
    parser.add_argument("source_path", type=Path, help="Source file path")
    parser.add_argument("target_path", type=Path, help="Target file path")
    parser.add_argument(
        "--content_dir",
        type=Path,
        default=Path.cwd() / "content",
        help="Content directory (default: ./content)",
    )
    args = parser.parse_args()

    update_references(args.source_path, args.target_path, args.content_dir)

import os
import sys
from pathlib import Path
import yaml
from typing import List, Dict, Callable, Any, Set, Tuple
import subprocess
import re

# Add the project root to sys.path
sys.path.append(str(Path(__file__).parent.parent))

import scripts.utils as script_utils

MetadataIssues = Dict[str, List[str]]
PathMap = Dict[str, Path]  # Maps URLs to their source files


def check_required_fields(metadata: dict) -> List[str]:
    """Check for empty required metadata fields."""
    errors = []
    required_fields = ("title", "description", "tags", "permalink")

    if not metadata:
        errors.append(f"No valid frontmatter found")
        return errors

    for field in required_fields:
        if field not in metadata:
            errors.append(f"Missing {field} field")
        elif metadata[field] in (None, "", [], {}):
            errors.append(f"Empty {field} field")

    return errors


def check_url_uniqueness(
    urls: Set[str], existing_urls: PathMap, source_path: Path
) -> List[str]:
    """Check if any URLs (permalinks/aliases) have already been used.

    Args:
        urls: Set of URLs to check
        existing_urls: Map of known URLs to their file paths
        source_path: Path to file being checked

    Returns:
        List of error messages for duplicate URLs
    """
    errors = []
    for url in urls:
        if url in existing_urls:
            errors.append(f"URL '{url}' already used in: {existing_urls[url]}")
        else:
            existing_urls[url] = source_path
    return errors


def get_all_urls(metadata: dict) -> Set[str]:
    """Extract all URLs (permalinks and aliases) from metadata.

    Args:
        metadata: The file's frontmatter metadata

    Returns:
        Set of all URLs defined in the metadata
    """
    urls = set()

    # Add permalink if it exists
    if permalink := metadata.get("permalink"):
        urls.add(permalink)

    # Add all aliases if they exist
    if aliases := metadata.get("aliases", []):
        # Handle both string and list aliases
        if isinstance(aliases, str):
            urls.add(aliases)
        else:
            urls.update(aliases)

    return urls


def check_file_metadata(
    metadata: dict, existing_urls: PathMap, file_path: Path
) -> MetadataIssues:
    """Check a single file's metadata for various issues.

    Args:
        metadata: The file's frontmatter metadata
        existing_urls: Map of known URLs to their file paths
        file_path: Path to the file being checked

    Returns:
        Dictionary mapping check names to lists of error messages
    """
    issues: MetadataIssues = {
        "required_fields": check_required_fields(metadata),
    }

    if metadata:
        urls = get_all_urls(metadata)
        if urls:
            issues["duplicate_urls"] = check_url_uniqueness(
                urls, existing_urls, file_path
            )

    return issues


def print_issues(file_path: Path, issues: MetadataIssues) -> None:
    """Print issues found in a file."""
    if any(lst for lst in issues.values()):
        print(f"\nIssues found in {file_path}:")
        for check_name, errors in issues.items():
            if errors:  # Only print sections that have errors
                print(f"  {check_name}:")
                for error in errors:
                    print(f"    - {error}")


def main() -> None:
    """Check all markdown files for metadata issues."""
    git_root = script_utils.get_git_root()
    content_dir = git_root / "content"
    existing_urls: PathMap = {}
    has_errors = False

    markdown_files = script_utils.get_files(
        dir_to_search=content_dir,
        filetypes_to_match=(".md",),
        use_git_ignore=True,
        ignore_dirs=["templates"],
    )

    for file_path in markdown_files:
        rel_path = file_path.relative_to(git_root)
        metadata, _ = script_utils.split_yaml(file_path)
        issues = check_file_metadata(metadata, existing_urls, rel_path)

        if any(lst for lst in issues.values()):
            has_errors = True
            print_issues(rel_path, issues)

    if has_errors:
        sys.exit(1)


if __name__ == "__main__":
    main()

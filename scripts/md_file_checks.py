import os
import sys
from pathlib import Path
import yaml
from typing import List, Dict, Callable, Any
import subprocess
import re

# Add the project root to sys.path
sys.path.append(str(Path(__file__).parent.parent))

import scripts.utils as script_utils

MetadataIssues = Dict[str, List[str]]


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


def check_file_metadata(metadata: dict) -> MetadataIssues:
    """Check a single file's metadata for various issues."""
    return {
        "required_fields": check_required_fields(metadata),
    }


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

    has_errors = False
    markdown_files = script_utils.get_files(
        dir_to_search=content_dir,
        filetypes_to_match=(".md",),
        use_git_ignore=True,
        ignore_dirs=["templates"],
    )

    for file_path in markdown_files:
        metadata, _ = script_utils.split_yaml(file_path)
        issues = check_file_metadata(metadata)

        if any(lst for lst in issues.values()):
            has_errors = True
            print_issues(file_path.relative_to(git_root), issues)

    if has_errors:
        sys.exit(1)


if __name__ == "__main__":
    main()

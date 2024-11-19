import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Callable, Dict, List, Set, Tuple

import sass
import yaml

# Add the project root to sys.path
sys.path.append(str(Path(__file__).parent.parent))

import scripts.utils as script_utils

MetadataIssues = Dict[str, List[str]]
PathMap = Dict[str, Path]  # Maps URLs to their source files


def check_required_fields(metadata: dict) -> List[str]:
    """
    Check for empty required metadata fields.
    """
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
    """
    Check if any URLs (permalinks/aliases) have already been used.

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
    """
    Extract all URLs (permalinks and aliases) from metadata.

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


def check_invalid_md_links(file_path: Path) -> List[str]:
    """
    Check for invalid markdown links that don't start with '/'.

    Args:
        file_path: Path to the markdown file to check

    Returns:
        List of error messages for invalid links found
    """
    INVALID_MD_LINK_PATTERN = r"\]\([-A-Za-z_0-9:]+(\.md)?\)"
    errors = []

    content = file_path.read_text()
    matches = re.finditer(INVALID_MD_LINK_PATTERN, content)

    for match in matches:
        if "shard-theory" in match.group() and "design.md" in file_path.name:
            continue  # I mention this checker, not a real broken link
        line_num = content[: match.start()].count("\n") + 1
        errors.append(
            f"Invalid markdown link at line {line_num}: {match.group()}"
        )

    return errors


def check_file_metadata(
    metadata: dict, existing_urls: PathMap, file_path: Path
) -> MetadataIssues:
    """
    Check a single file's metadata and content for various issues.

    Args:
        metadata: The file's frontmatter metadata
        existing_urls: Map of known URLs to their file paths
        file_path: Path to the file being checked

    Returns:
        Dictionary mapping check names to lists of error messages
    """
    issues: MetadataIssues = {
        "required_fields": check_required_fields(metadata),
        "invalid_links": check_invalid_md_links(file_path),
    }

    if metadata:
        urls = get_all_urls(metadata)
        if urls:
            issues["duplicate_urls"] = check_url_uniqueness(
                urls, existing_urls, file_path
            )

    return issues


def print_issues(file_path: Path, issues: MetadataIssues) -> None:
    """
    Print issues found in a file.
    """
    if any(lst for lst in issues.values()):
        print(f"\nIssues found in {file_path}:")
        for check_name, errors in issues.items():
            if errors:  # Only print sections that have errors
                print(f"  {check_name}:")
                for error in errors:
                    print(f"    - {error}")


def compile_scss(scss_file_path: Path) -> str:
    """
    Compile SCSS file to CSS string.

    Args:
        scss_file_path: Path to the SCSS file

    Returns:
        Compiled CSS as string

    Raises:
        subprocess.CalledProcessError: If SCSS compilation fails
        FileNotFoundError: If sass compiler is not found
    """
    if not scss_file_path.exists():
        return ""

    styles_dir = scss_file_path.parent
    result = subprocess.run(
        ["sass", f"--load-path={styles_dir}", str(scss_file_path)],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout


def check_font_files(css_content: str, base_dir: Path) -> List[str]:
    """
    Check if font files referenced in CSS exist.

    Args:
        css_content: Compiled CSS content
        base_dir: Base directory for resolving font paths

    Returns:
        List of missing font file paths
    """
    missing_fonts = []
    font_pattern = re.compile(
        r"""@font-face\s*\{[^}]*?
        src:\s*url\(\s*["']?(.*?)["']?\)\s*
        (?:format\([^\)]*\)\s*)?
        [^;]*;""",
        re.VERBOSE | re.DOTALL,
    )

    for match in font_pattern.finditer(css_content):
        font_path = match.group(1)
        if font_path.startswith(("http:", "https:", "data:")):
            continue

        if font_path.startswith("/static/"):
            font_path = f"/quartz{font_path}"

        full_path = (base_dir / font_path.lstrip("/")).resolve()
        if not full_path.is_file():
            missing_fonts.append(font_path)

    return missing_fonts


def check_font_families(css_content: str) -> List[str]:
    """
    Check if all referenced font families are properly declared.

    Args:
        css_content: Compiled CSS content

    Returns:
        List of undeclared font family names
    """
    # Common system and fallback fonts to ignore
    SYSTEM_FONTS = {
        "serif",
        "sans-serif",
        "monospace",
        "cursive",
        "fantasy",
        "system-ui",
        "ui-serif",
        "ui-sans-serif",
        "ui-monospace",
        "garamond",
        "times new roman",
        "courier new",
        "jetbrains mono",
    }

    def clean_font_name(name: str) -> str:
        """
        Clean font name by removing quotes and OpenType feature tags.
        """
        name = name.strip().strip("\"'").lower()
        # Remove OpenType feature tags (e.g., :+swsh, :smcp)
        return name.split(":")[0]

    # Find all @font-face declarations and their font families
    font_face_pattern = re.compile(
        r"""@font-face\s*\{[^}]*?
        font-family:\s*["']?(.*?)["']?[;,]""",
        re.VERBOSE | re.DOTALL,
    )
    declared_fonts = {
        clean_font_name(match.group(1))
        for match in font_face_pattern.finditer(css_content)
    }

    # Find all font-family references in CSS custom properties
    missing_fonts = []
    font_ref_pattern = re.compile(r'--[^:]*?:\s*["\'](.*?)["\']\s*(?:,|;)')

    for match in font_ref_pattern.finditer(css_content):
        fonts = match.group(1).split(",")
        for font in fonts:
            font = clean_font_name(font)
            if font not in SYSTEM_FONTS and font not in declared_fonts:
                missing_fonts.append(f"Undeclared font family: {font}")

    return missing_fonts


def check_scss_font_files(scss_file_path: Path, base_dir: Path) -> List[str]:
    """
    Check SCSS file for font-related issues.

    Args:
        scss_file_path: Path to the SCSS file
        base_dir: Base directory for resolving font paths

    Returns:
        List of issues found (missing files and undeclared families)
    """
    try:
        css_content = compile_scss(scss_file_path)
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        error_msg = getattr(e, "stderr", str(e))
        print(f"Error compiling SCSS: {error_msg}")
        return [f"SCSS compilation error: {error_msg}"]

    missing_files = check_font_files(css_content, base_dir)
    undeclared_families = check_font_families(css_content)

    return missing_files + undeclared_families


def main() -> None:
    """
    Check source files for issues.
    """
    git_root = script_utils.get_git_root()
    content_dir = git_root / "content"
    existing_urls: PathMap = {}
    has_errors = False

    # Check markdown files
    markdown_files = script_utils.get_files(
        dir_to_search=content_dir,
        filetypes_to_match=(".md",),
        use_git_ignore=True,
        ignore_dirs=["templates", "drafts"],
    )

    for file_path in markdown_files:
        rel_path = file_path.relative_to(git_root)
        metadata, _ = script_utils.split_yaml(file_path)
        issues = check_file_metadata(metadata, existing_urls, file_path)

        if any(lst for lst in issues.values()):
            has_errors = True
            print_issues(rel_path, issues)

    # Check font files
    fonts_scss_path = git_root / "quartz" / "styles" / "fonts.scss"
    if missing_fonts := check_scss_font_files(fonts_scss_path, git_root):
        has_errors = True
        print("\nMissing font files:")
        for font in missing_fonts:
            print(f"  - {font}")

    if has_errors:
        sys.exit(1)


if __name__ == "__main__":
    main()

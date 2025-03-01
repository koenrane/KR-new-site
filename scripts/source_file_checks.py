"""
Check source files for issues, like invalid links, missing required fields, etc.
"""

import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Literal, NamedTuple, Set

# Add the project root to sys.path
# pylint: disable=wrong-import-position
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
        errors.append("No valid frontmatter found")
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
    invalid_md_link_pattern = r"\]\([-A-Za-z_0-9:]+(\.md)?\)"
    errors = []

    content = file_path.read_text()
    matches = re.finditer(invalid_md_link_pattern, content)

    for match in matches:
        if "shard-theory" in match.group() and "design.md" in file_path.name:
            continue  # I mention this checker, not a real broken link
        line_num = content[: match.start()].count("\n") + 1
        errors.append(
            f"Invalid markdown link at line {line_num}: {match.group()}"
        )

    return errors


def check_latex_tags(file_path: Path) -> List[str]:
    """
    Check for \\tag{ in markdown files, which should be avoided.

    Args:
        file_path: Path to the markdown file to check

    Returns:
        List of error messages for found LaTeX tags
    """
    # There's an innocuous use of LaTeX tags in design.md, so we'll ignore it
    if "design.md" in file_path.name:
        return []

    tag_pattern = r"(?<!\\)\\tag\{"
    errors = []

    content = file_path.read_text()
    matches = re.finditer(tag_pattern, content)

    for match in matches:
        line_num = content[: match.start()].count("\n") + 1
        errors.append(f"LaTeX \\tag{{}} found at line {line_num}")

    return errors


def _slug_in_metadata(slug: str, target_metadata: dict) -> bool:
    is_alias = (
        target_metadata.get("aliases") and slug in target_metadata["aliases"]
    )
    return slug == target_metadata["permalink"] or bool(is_alias)


class SequenceDirection(NamedTuple):
    """
    Represents a direction in the post sequence (next/prev) and its
    corresponding target field.
    """

    key: Literal["next", "prev"]
    target_field_prefix: Literal["prev", "next"]


def check_post_titles(
    current_mapping: dict,
    target_mapping: dict,
    target_slug: str,
    direction: Literal["next", "prev"],
) -> List[str]:
    """
    Check if post titles match between linked posts.

    Args:
        current_mapping: Metadata of the current post
        target_mapping: Metadata of the linked post (next/prev)
        target_slug: Permalink of the linked post
        direction: Direction of the link ('next' or 'prev')

    Returns:
        List of error messages for title mismatches
    """
    errors = []

    def _simplify_title(title: str) -> str:
        """
        Simplify a title by removing non-alphanumeric characters and converting
        to lowercase.
        """
        return re.sub(r"[^a-zA-Z0-9]+", "", title).lower()

    title_field = f"{direction}-post-title"
    if title_field in current_mapping:
        expected_title = current_mapping[title_field]
        actual_title = target_mapping.get("title", "")
        if _simplify_title(expected_title) != _simplify_title(actual_title):
            errors.append(
                f"{title_field} mismatch: expected '{expected_title}', "
                f"but {target_slug} has title '{actual_title}'"
            )

    return errors


def check_sequence_relationships(
    permalink: str, sequence_data: Dict[str, dict]
) -> List[str]:
    """
    Check if next-post-slug and prev-post-slug relationships are bidirectional,
    and that {next,prev}-post-title fields match the actual titles.

    For example:
    - If post A has next-post-slug=B, then post B must have prev-post-slug=A
    - If post A has next-post-slug=B and next-post-title=X, then
        post B's title must be X
    """
    if not permalink or permalink not in sequence_data:
        raise ValueError(f"Invalid permalink {permalink}")

    errors: List[str] = []
    current_mapping = sequence_data[permalink]
    # Compute all valid identifiers (permalink and aliases) for the current post
    valid_ids = {
        key for key, value in sequence_data.items() if value is current_mapping
    }

    directions = [
        SequenceDirection("next", "prev"),
        SequenceDirection("prev", "next"),
    ]

    for direction in directions:
        slug_field = f"{direction.key}-post-slug"
        if slug_field not in current_mapping:
            continue

        target_slug: str = current_mapping[slug_field]
        if target_slug not in sequence_data:
            errors.append(f"Could not find post with permalink {target_slug}")
            continue

        target_mapping = sequence_data[target_slug]
        target_slug_field = f"{direction.target_field_prefix}-post-slug"
        target_slug_value = target_mapping.get(target_slug_field, "")

        if target_slug_value not in valid_ids:
            errors.append(
                f"Post {target_slug} should have "
                f"{target_slug_field}={permalink}; "
                f"currently has {target_slug_value}"
            )

        # Check titles match
        errors.extend(
            check_post_titles(
                current_mapping, target_mapping, target_slug, direction.key
            )
        )

    return errors


def check_file_data(
    metadata: dict,
    existing_urls: PathMap,
    file_path: Path,
    all_posts_metadata: Dict[str, dict],
) -> MetadataIssues:
    """
    Check a single file's metadata and content for various issues.

    Args:
        metadata: The file's frontmatter metadata
        existing_urls: Map of known URLs to their file paths
        file_path: Path to the file being checked
        all_posts_metadata: Map of file paths to their metadata for all posts

    Returns:
        Dictionary mapping check names to lists of error messages
    """
    issues: MetadataIssues = {
        "required_fields": check_required_fields(metadata),
        "invalid_links": check_invalid_md_links(file_path),
        "latex_tags": check_latex_tags(file_path),
    }

    if metadata:
        urls = get_all_urls(metadata)
        if urls:
            issues["duplicate_urls"] = check_url_uniqueness(
                urls, existing_urls, file_path
            )
        issues["post_slug_relationships"] = check_sequence_relationships(
            metadata["permalink"], all_posts_metadata
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
    sass_path = shutil.which("sass")
    if not sass_path:
        raise FileNotFoundError("sass executable not found")

    result = subprocess.run(
        [sass_path, f"--load-path={styles_dir}", str(scss_file_path)],
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
    system_fonts = {
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
            if font not in system_fonts and font not in declared_fonts:
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


def build_sequence_data(markdown_files: List[Path]) -> Dict[str, dict]:
    """
    Build a mapping of post slugs to their forward and previous post slugs.
    """
    all_sequence_data: Dict[str, dict] = {}
    for file_path in markdown_files:
        metadata, _ = script_utils.split_yaml(file_path)
        if metadata:
            # Build a mapping with only the forward and previous post slugs
            slug_mapping: Dict[str, str] = {}
            for key in (
                "title",
                "next-post-slug",
                "prev-post-slug",
                "next-post-title",
                "prev-post-title",
            ):
                if key in metadata:
                    slug_mapping[key] = metadata[key]
            all_sequence_data[metadata["permalink"]] = slug_mapping
            if aliases := metadata.get("aliases", []):
                for alias in aliases:
                    if not alias:
                        continue
                    all_sequence_data[alias] = slug_mapping

    return all_sequence_data


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

    # mapping from permalink or alias to its forward and prev post slugs
    all_sequence_data: Dict[str, dict] = build_sequence_data(
        list(markdown_files)
    )

    for file_path in markdown_files:
        metadata, _ = script_utils.split_yaml(file_path)
        if metadata:
            rel_path = file_path.relative_to(git_root)
            issues = check_file_data(
                metadata, existing_urls, file_path, all_sequence_data
            )
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

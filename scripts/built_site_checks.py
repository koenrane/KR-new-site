"""
Script to check the built static site for common issues and errors.
"""

import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Dict, List

import tqdm
from bs4 import BeautifulSoup, Tag

# Add the project root to sys.path
# pylint: disable=C0413
sys.path.append(str(Path(__file__).parent.parent))

import scripts.utils as script_utils
from scripts import compress

git_root = script_utils.get_git_root()
RSS_XSD_PATH = git_root / "scripts" / ".rss-2.0.xsd"

IssuesDict = Dict[str, List[str] | bool]


def check_localhost_links(soup: BeautifulSoup) -> List[str]:
    """
    Check for localhost links in the HTML.
    """
    localhost_links = []
    links = soup.find_all("a", href=True)
    for link in links:
        href = link["href"]
        if href.startswith("localhost:") or href.startswith(
            ("http://localhost", "https://localhost")
        ):
            localhost_links.append(href)
    return localhost_links


def check_favicons_missing(soup: BeautifulSoup) -> bool:
    """
    Check if favicons are missing.
    """
    return soup.find("img", class_="favicon") is None


def check_unrendered_footnotes(soup: BeautifulSoup) -> List[str]:
    """
    Check for unrendered footnotes in the format [^something].

    Returns a list of the footnote references themselves.
    """
    # Matches [^1], [^note], [^note-1], etc.
    footnote_pattern = r"\[\^[a-zA-Z0-9-_]+\]"
    unrendered_footnotes = []

    for p in soup.find_all("p"):
        matches = re.findall(footnote_pattern, p.text)
        if matches:
            unrendered_footnotes.extend(matches)

    return unrendered_footnotes


def check_invalid_anchors(soup: BeautifulSoup, base_dir: Path) -> List[str]:
    """
    Check for invalid internal anchor links in the HTML.
    """
    invalid_anchors = []
    links = soup.find_all("a", href=True)
    for link in links:
        href = link["href"]
        if href.startswith("#"):
            # Check anchor in current page
            anchor_id = href[1:]
            if not soup.find(id=anchor_id):
                invalid_anchors.append(href)
        elif (href.startswith("/") or href.startswith(".")) and "#" in href:
            # Check anchor in other internal page
            page_path, anchor = href.split("#", 1)
            # Remove leading ".." from page_path
            page_path = page_path.lstrip("./")
            full_path = base_dir / page_path
            if not full_path.suffix == ".html":
                full_path = full_path.with_suffix(".html")

            if full_path.is_file():
                with open(full_path, "r", encoding="utf-8") as f:
                    page_soup = BeautifulSoup(f.read(), "html.parser")
                if not page_soup.find(id=anchor):
                    invalid_anchors.append(href)
            else:
                invalid_anchors.append(href)  # Page doesn't exist
    return invalid_anchors


# Check that no blockquote element ends with ">",
# because it probably needed a newline before it
def check_blockquote_elements(soup: BeautifulSoup) -> List[str]:
    """
    Check for blockquote elements ending with ">".
    """
    problematic_blockquotes: List[str] = []
    blockquotes = soup.find_all("blockquote")
    for blockquote in blockquotes:
        # Get the last non-empty string content of the blockquote
        contents = list(blockquote.stripped_strings)
        if contents and contents[-1].strip().endswith(">"):
            # Get a truncated version of the blockquote content for reporting
            content_preview = (
                " ".join(contents)[:50] + "..."
                if len(" ".join(contents)) > 50
                else " ".join(contents)
            )
            problematic_blockquotes.append(content_preview)
    return problematic_blockquotes


def check_problematic_paragraphs(soup: BeautifulSoup) -> List[str]:
    """
    Check for paragraphs starting with specific phrases.
    """
    phrases = ("Table: ", "Figure: ", "Code: ")
    prefixes = (r"^: ", r"^#+ ")

    problematic_paragraphs = []
    for p in soup.find_all(["p", "dt"]):
        text = p.get_text().strip()
        if any(phrase in text for phrase in phrases) or any(
            re.match(prefix, text) for prefix in prefixes
        ):
            problematic_paragraphs.append(
                text[:50] + "..." if len(text) > 50 else text
            )
    return problematic_paragraphs


def check_unrendered_spoilers(soup: BeautifulSoup) -> List[str]:
    """
    Check for unrendered spoilers.
    """
    unrendered_spoilers = []
    blockquotes = soup.find_all("blockquote")
    for blockquote in blockquotes:
        # Check each paragraph / text child in the blockquote
        for child in blockquote.children:
            if child.name == "p":
                text = child.get_text().strip()
                if text.startswith("! "):
                    unrendered_spoilers.append(text)
    return unrendered_spoilers


def check_unrendered_subtitles(soup: BeautifulSoup) -> List[str]:
    """
    Check for unrendered subtitle lines.
    """
    unrendered_subtitles = []
    paragraphs = soup.find_all("p")
    for p in paragraphs:
        text = p.get_text().strip()
        if text.startswith("Subtitle:") and "subtitle" not in p.get(
            "class", []
        ):
            unrendered_subtitles.append(
                text[:50] + "..." if len(text) > 50 else text
            )
    return unrendered_subtitles


def parse_html_file(file_path: Path) -> BeautifulSoup:
    """
    Parse an HTML file and return a BeautifulSoup object.
    """
    with open(file_path, "r", encoding="utf-8") as file:
        return BeautifulSoup(file.read(), "html.parser")


# Check the existence of local files with these extensions
_MEDIA_EXTENSIONS = list(compress.ALLOWED_EXTENSIONS) + [
    ".svg",
    ".avif",
    ".ico",
]


def resolve_media_path(src: str, base_dir: Path) -> Path:
    """
    Resolve a media file path, trying both absolute and relative paths.

    Args:
        src: The source path from the HTML tag
        base_dir: The base directory to resolve paths from

    Returns:
        The resolved Path object
    """
    if src.startswith("/"):
        return (base_dir / src.lstrip("/")).resolve()

    # For relative paths, try both direct and with base_dir
    full_path = (base_dir / src).resolve()
    if not full_path.is_file():
        # Try relative to base_dir
        full_path = (base_dir / src.lstrip("./")).resolve()

    return full_path


def check_local_media_files(soup: BeautifulSoup, base_dir: Path) -> List[str]:
    """
    Verify the existence of local media files (images, videos, SVGs).
    """
    missing_files = []
    media_tags = soup.find_all(["img", "video", "source", "svg"])

    for tag in media_tags:
        src = tag.get("src") or tag.get("href")
        if src and not src.startswith(("http://", "https://")):
            # It's a local file
            file_extension = Path(src).suffix.lower()
            if file_extension in _MEDIA_EXTENSIONS:
                full_path = resolve_media_path(src, base_dir)
                if not full_path.is_file():
                    missing_files.append(f"{src} (resolved to {full_path})")

    return missing_files


def check_asset_references(
    soup: BeautifulSoup, file_path: Path, base_dir: Path
) -> List[str]:
    """
    Check for asset references and verify their existence.
    """
    missing_assets = []

    def resolve_asset_path(href: str) -> Path:
        if href.startswith("/"):
            # Absolute path within the site
            return (base_dir / href.lstrip("/")).resolve()
        # Relative path
        return (file_path.parent / href).resolve()

    def check_asset(href: str) -> None:
        if href and not href.startswith(("http://", "https://")):
            full_path = resolve_asset_path(href)
            if not full_path.is_file():
                missing_assets.append(
                    f"{href} (resolved to {full_path.relative_to(base_dir)})"
                )

    # Check link tags for CSS files (including preloaded stylesheets)
    for link in soup.find_all("link"):
        rel = link.get("rel", [])
        if isinstance(rel, list):
            rel = " ".join(rel)
        if "stylesheet" in rel or (
            "preload" in rel and link.get("as") == "style"
        ):
            check_asset(link.get("href"))

    # Check script tags for JS files
    for script in soup.find_all("script", src=True):
        check_asset(script["src"])

    return missing_assets


def check_katex_elements_for_errors(soup: BeautifulSoup) -> List[str]:
    """
    Check for KaTeX elements with color #cc0000.
    """
    problematic_katex = []
    katex_elements = soup.select(".katex")
    for element in katex_elements:
        error_span = element.select_one('span[style*="color:#cc0000"]')
        if error_span:
            content = element.get_text().strip()
            problematic_katex.append(
                f"KaTeX element: {content[:50]}..."
                if len(content) > 50
                else content
            )
    return problematic_katex


def is_redirect(soup: BeautifulSoup) -> bool:
    """
    Check if the page is a redirect.
    """
    return soup.find("meta", {"http-equiv": "refresh"}) is not None


def check_critical_css(soup: BeautifulSoup) -> bool:
    """
    Check if the page has critical CSS in the head.
    """
    head = soup.find("head")
    if isinstance(head, Tag):
        return bool(head.find("style", {"id": "critical-css"}))
    return False


def body_is_empty(soup: BeautifulSoup) -> bool:
    """
    Check if the body is empty.

    Looks for children of the body tag.
    """
    body = soup.find("body")
    return (
        not body
        or not isinstance(body, Tag)
        or len(body.find_all(recursive=False)) == 0
    )


def check_duplicate_ids(soup: BeautifulSoup) -> List[str]:
    """
    Check for duplicate anchor IDs in the HTML.

    Returns a list of:
    - IDs that appear multiple times
    - IDs existing with and without -\\d suffix (e.g., 'intro' and 'intro-1')
    Excludes IDs within mermaid flowcharts.
    """
    # Get all IDs except those in flowcharts
    elements_with_ids = [
        element["id"]
        for element in soup.find_all(id=True)
        if not element.find_parent(class_="flowchart")
    ]

    # Count occurrences of each ID
    id_counts = Counter(elements_with_ids)
    duplicates = []

    # Check for both duplicates and numbered variants
    for id_, count in id_counts.items():
        # It's ok for multiple fnrefs to reference the same note
        if id_.startswith("user-content-fnref-"):
            continue

        if count > 1:
            duplicates.append(f"{id_} (found {count} times)")

        # Check if this is a base ID with numbered variants
        if not re.match(r".*-\d+$", id_):  # If this is not a numbered ID
            numbered_variants = [
                other_id
                for other_id in id_counts
                if other_id.startswith(id_ + "-")
                and re.match(r".*-\d+$", other_id)
            ]
            if numbered_variants:
                total = count + sum(
                    id_counts[variant] for variant in numbered_variants
                )
                duplicates.append(
                    f"{id_} (found {total} times, including numbered variants)"
                )

    return duplicates


def check_unrendered_emphasis(soup: BeautifulSoup) -> List[str]:
    """
    Check for text nodes ending in markdown emphasis characters (* or _).

    These likely indicate unrendered markdown emphasis.
    """
    problematic_texts = []

    # Find all text nodes
    for p in soup.find_all("p"):
        # Skip script and style elements
        if p.parent.name in ["script", "style", "code", "pre"]:
            continue

        # Check if text ends with * or _ possibly followed by whitespace
        stripped_text = p.text.strip()
        if stripped_text and re.search(r"[*_]\s*$", stripped_text):
            preview = (
                "..." + stripped_text[-50:]
                if len(stripped_text) > 50
                else stripped_text
            )
            problematic_texts.append(preview)

    return problematic_texts


def check_file_for_issues(file_path: Path, base_dir: Path) -> IssuesDict:
    """
    Check a single HTML file for various issues.
    """
    soup = parse_html_file(file_path)
    if is_redirect(soup):
        return {}
    issues: IssuesDict = {
        "localhost_links": check_localhost_links(soup),
        "invalid_anchors": check_invalid_anchors(soup, base_dir),
        "problematic_paragraphs": check_problematic_paragraphs(soup),
        "missing_media_files": check_local_media_files(soup, base_dir),
        "trailing_blockquotes": check_blockquote_elements(soup),
        "missing_assets": check_asset_references(soup, file_path, base_dir),
        "problematic_katex": check_katex_elements_for_errors(soup),
        "unrendered_subtitles": check_unrendered_subtitles(soup),
        "unrendered_footnotes": check_unrendered_footnotes(soup),
        "missing_critical_css": not check_critical_css(soup),
        "empty_body": body_is_empty(soup),
        "duplicate_ids": check_duplicate_ids(soup),
        "unrendered_spoilers": check_unrendered_spoilers(soup),
        "unrendered_emphasis": check_unrendered_emphasis(soup),
    }

    if "design" in file_path.name:
        issues["missing_favicon"] = check_favicons_missing(soup)
    return issues


def check_rss_file_for_issues(
    git_root_path: Path, custom_xsd_path: Path | None = None
) -> None:
    """
    Check an RSS file for various issues.

    Uses xmllint via `brew install libxml2`.
    """
    rss_path = git_root_path / "public" / "rss.xml"
    subprocess.run(
        [
            "/usr/bin/xmllint",
            "--noout",
            "--schema",
            str(custom_xsd_path or RSS_XSD_PATH),
            str(rss_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def print_issues(
    file_path: Path,
    issues: IssuesDict,
) -> None:
    """
    Print issues found in a file.
    """
    if any(lst for lst in issues.values()):
        print(f"Issues found in {file_path}:")
        for issue, lst in issues.items():
            if lst:
                if isinstance(lst, list):
                    print(f"  {issue}:")
                    for item in lst:
                        print(f"    - {item}")
                elif isinstance(lst, bool):
                    print(f"  {issue}: {lst}")

        print()  # Add a blank line between files with issues


def main() -> None:
    """
    Check all HTML files in the public directory for issues.
    """
    public_dir: Path = git_root / "public"
    issues_found: bool = False

    check_rss_file_for_issues(git_root)

    for root, _, files in os.walk(public_dir):
        for file in tqdm.tqdm(files, desc="Webpages checked"):
            if file.endswith(".html"):
                file_path = Path(root) / file
                issues = check_file_for_issues(file_path, public_dir)

                print_issues(file_path, issues)
                if any(lst for lst in issues.values()):
                    issues_found = True

    if issues_found:
        sys.exit(1)


if __name__ == "__main__":
    main()

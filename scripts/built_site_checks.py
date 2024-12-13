"""
Script to check the built static site for common issues and errors.
"""

import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Dict, List, Set

import tqdm
from bs4 import BeautifulSoup, NavigableString, Tag

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
            _add_to_list(
                problematic_blockquotes,
                " ".join(contents),
                prefix="Problematic blockquote: ",
            )
    return problematic_blockquotes


def check_unrendered_html(soup: BeautifulSoup) -> List[str]:
    """
    Check for unrendered HTML in the page.

    Looks for text content containing HTML-like patterns (<tag>, </tag>, or
    <tag/>) that should have been rendered by the markdown processor.
    """
    problematic_texts: List[str] = []

    # Basic HTML tag pattern
    tag_pattern = r"(</?[a-zA-Z][a-zA-Z0-9]*(?: |/?>))"

    for element in soup.find_all(string=True):
        if not should_skip(element):  # Reuse existing skip logic
            text = element.strip()
            if text:
                # Look for HTML-like patterns
                matches = re.findall(tag_pattern, text)
                if matches:
                    _add_to_list(
                        problematic_texts,
                        text,
                        prefix=f"Unrendered HTML {matches}: ",
                    )

    return problematic_texts


def _add_to_list(
    lst: List[str],
    text: str,
    show_end: bool = False,
    preview_chars: int = 100,
    prefix: str = "",
) -> None:
    if preview_chars <= 0:
        raise ValueError("preview_chars must be greater than 0")

    if text:
        if len(text) <= preview_chars:
            lst.append(prefix + text)
        else:
            to_append = (
                text[-preview_chars:] + "..."
                if show_end
                else text[:preview_chars]
            )
            lst.append(prefix + to_append)


def check_problematic_paragraphs(soup: BeautifulSoup) -> List[str]:
    """
    Check for text nodes starting with specific phrases.

    Efficiently searches without duplicates, ignoring text within <code> tags.
    """
    bad_anywhere = (
        r"\*\*",  # Bold markdown
        r"\_",  # Underscore
        r"> \[\![a-zA-Z]+\]",  # Callout syntax
    )
    bad_prefixes = (r"Table: ", r"Figure: ", r"Code: ")
    bad_paragraph_starting_prefixes = (r"^: ", r"^#+ ")

    problematic_paragraphs: List[str] = []

    def _maybe_add_text(text: str) -> None:
        text = text.strip()
        if any(re.search(pattern, text) for pattern in bad_anywhere) or any(
            re.search(prefix, text) for prefix in bad_prefixes
        ):
            _add_to_list(
                problematic_paragraphs, text, prefix="Problematic paragraph: "
            )

    # Check all <p> and <dt> elements
    for element in soup.find_all(["p", "dt"]):
        if any(
            re.search(prefix, element.text)
            for prefix in bad_paragraph_starting_prefixes
        ):
            _add_to_list(
                problematic_paragraphs,
                element.text,
                prefix="Problematic paragraph: ",
            )
        for text_node in element.find_all(string=True):
            if not any(parent.name == "code" for parent in text_node.parents):
                _maybe_add_text(text_node)

    # Check direct text in <article> and <blockquote>
    for parent in soup.find_all(["article", "blockquote"]):
        for child in parent.children:
            if isinstance(child, str):  # Check if it's a direct text node
                _maybe_add_text(child)

    return problematic_paragraphs


def check_unrendered_spoilers(soup: BeautifulSoup) -> List[str]:
    """
    Check for unrendered spoilers.
    """
    unrendered_spoilers: List[str] = []
    blockquotes = soup.find_all("blockquote")
    for blockquote in blockquotes:
        # Check each paragraph / text child in the blockquote
        for child in blockquote.children:
            if child.name == "p":
                text = child.get_text().strip()
                if text.startswith("! "):
                    _add_to_list(
                        unrendered_spoilers, text, prefix="Unrendered spoiler: "
                    )
    return unrendered_spoilers


def check_unrendered_subtitles(soup: BeautifulSoup) -> List[str]:
    """
    Check for unrendered subtitle lines.
    """
    unrendered_subtitles: List[str] = []
    paragraphs = soup.find_all("p")
    for p in paragraphs:
        text = p.get_text().strip()
        if text.startswith("Subtitle:") and "subtitle" not in p.get(
            "class", []
        ):
            _add_to_list(
                unrendered_subtitles, text, prefix="Unrendered subtitle: "
            )
    return unrendered_subtitles


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
    problematic_katex: List[str] = []
    katex_elements = soup.select(".katex-error")
    for element in katex_elements:
        content = element.get_text().strip()
        _add_to_list(problematic_katex, content, prefix="KaTeX error: ")
    return problematic_katex


def katex_element_surrounded_by_blockquote(soup: BeautifulSoup) -> List[str]:
    """
    Check for KaTeX display elements that start with '>>' but aren't inside a
    blockquote.

    These mathematical statements should be inside a blockquote.
    """
    problematic_katex: List[str] = []

    # Find all KaTeX display elements
    katex_displays = soup.find_all(class_="katex-display")
    for katex in katex_displays:
        content = katex.get_text().strip()
        # Check if content starts with '>' and isn't inside a blockquote
        if content.startswith(">"):
            _add_to_list(problematic_katex, content, prefix="KaTeX error: ")

    return problematic_katex


def check_critical_css(soup: BeautifulSoup) -> bool:
    """
    Check if the page has critical CSS in the head.
    """
    head = soup.find("head")
    if isinstance(head, Tag):
        return bool(head.find("style", {"id": "critical-css"}))
    return False


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
        if not re.search(r".*-\d+$", id_):  # If this is not a numbered ID
            numbered_variants = [
                other_id
                for other_id in id_counts
                if other_id.startswith(id_ + "-")
                and re.search(r".*-\d+$", other_id)
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
    problematic_texts: List[str] = []

    # Find all text nodes
    for p in soup.find_all("p"):
        # Skip script and style elements
        if p.parent.name in ["script", "style", "code", "pre"]:
            continue

        # Check if text ends with * or _ possibly followed by whitespace
        stripped_text = p.text.strip()
        if stripped_text and re.search(r"[*_]\s*$", stripped_text):
            _add_to_list(
                problematic_texts,
                stripped_text,
                show_end=True,
                prefix="Unrendered emphasis: ",
            )

    return problematic_texts


def should_skip(element: Tag | NavigableString) -> bool:
    """
    Check if element should be skipped based on formatting_improvement_html.ts
    rules.
    """
    skip_tags = {"code", "pre", "script", "style"}
    skip_classes = {"no-formatting", "elvish", "bad-handwriting"}

    # Check current element and all parents
    current: Tag | NavigableString | None = element
    while current:
        if isinstance(
            current, Tag
        ):  # Only check Tag elements, not NavigableString
            if current.name in skip_tags or any(
                class_ in (current.get("class", []) or [])
                for class_ in skip_classes
            ):
                return True
        current = current.parent if isinstance(current.parent, Tag) else None
    return False


def check_unprocessed_quotes(soup: BeautifulSoup) -> List[str]:
    """
    Check for text nodes containing straight quotes (" or ') that should have
    been processed by formatting_improvement_html.ts.

    Skips nodes that would be skipped by the formatter:
    - Inside code, pre, script, style tags
    - Elements with classes: no-formatting, elvish, bad-handwriting
    """
    problematic_quotes: List[str] = []

    # Check all text nodes
    for element in soup.find_all(string=True):
        if element.strip():  # Skip empty text nodes
            if not should_skip(element):
                # Look for straight quotes
                straight_quotes = re.findall(r'["\']', element.string)
                if straight_quotes:
                    _add_to_list(
                        problematic_quotes,
                        element.string,
                        prefix=f"Unprocessed quotes {straight_quotes}: ",
                    )

    return problematic_quotes


def check_unprocessed_dashes(soup: BeautifulSoup) -> List[str]:
    """
    Check for text nodes containing multiple dashes (-- or ---) that should have
    been processed into em dashes by formatting_improvement_html.ts.
    """
    problematic_dashes: List[str] = []

    for element in soup.find_all(string=True):
        if element.strip() and not should_skip(element):
            # Look for two or more dashes in a row
            if re.search(r"[~\–\—\-\–]{2,}", element.string):
                _add_to_list(
                    problematic_dashes,
                    element.string,
                    prefix="Unprocessed dashes: ",
                )

    return problematic_dashes


def check_file_for_issues(
    file_path: Path, base_dir: Path, md_path: Path | None
) -> IssuesDict:
    """
    Check a single HTML file for various issues.

    Args:
        file_path: Path to the HTML file to check
        base_dir: Path to the base directory of the site
        md_path: Path to the markdown file that generated the HTML file

    Returns:
        Dictionary of issues found in the HTML file
    """
    soup = script_utils.parse_html_file(file_path)
    if script_utils.is_redirect(soup):
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
        "empty_body": script_utils.body_is_empty(soup),
        "duplicate_ids": check_duplicate_ids(soup),
        "unrendered_spoilers": check_unrendered_spoilers(soup),
        "unrendered_emphasis": check_unrendered_emphasis(soup),
        "katex_outside_blockquote": katex_element_surrounded_by_blockquote(
            soup
        ),
        "unprocessed_quotes": check_unprocessed_quotes(soup),
        "unprocessed_dashes": check_unprocessed_dashes(soup),
        "unrendered_html": check_unrendered_html(soup),
        "emphasis_spacing": check_emphasis_spacing(soup),
    }

    # Only check markdown assets if md_path exists and is a file
    if md_path and md_path.is_file():
        issues["missing_markdown_assets"] = check_markdown_assets_in_html(
            soup, md_path
        )

    if "test-page" in file_path.name:
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


tags_to_check_for_missing_assets = ("img", "video", "svg", "audio", "source")


def get_md_asset_counts(md_path: Path) -> Counter[str]:
    """
    Get the counts of all assets referenced in the markdown file.
    """
    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()
        # Match ![alt](src) pattern, capturing the src
        md_pattern_assets = re.findall(r"!\[.*?\]\((.*?)\)", content)

        # Match HTML tags with src attributes
        possible_tag_pattern = rf"{'|'.join(tags_to_check_for_missing_assets)}"
        tag_pattern = rf"<(?:{possible_tag_pattern}) [^>]*?src=[\"'](.*?)[\"']"
        tag_pattern_assets = re.findall(tag_pattern, content)

    # Count occurrences of each asset in markdown
    return Counter(
        asset.strip() for asset in md_pattern_assets + tag_pattern_assets
    )


def check_markdown_assets_in_html(
    soup: BeautifulSoup, md_path: Path
) -> List[str]:
    """
    Check that all assets referenced in the markdown source appear in the HTML
    at least as many times as they appear in the markdown.

    Args:
        soup: BeautifulSoup object of the HTML content
        md_path: Path to the markdown file that generated the HTML file

    Returns:
        List of asset references that have fewer instances in HTML
    """
    if not md_path.exists():
        raise ValueError(f"Markdown file {md_path} does not exist")

    md_asset_counts = get_md_asset_counts(md_path)

    # Count asset sources in HTML
    html_asset_counts: Counter[str] = Counter()
    for tag in tags_to_check_for_missing_assets:
        for element in soup.find_all(tag):
            if src := element.get("src"):
                html_asset_counts[src.strip()] += 1

    # Check each markdown asset exists in HTML with sufficient count
    missing_assets = []
    for asset, md_count in md_asset_counts.items():
        html_count = html_asset_counts[asset]
        if html_count < md_count:
            missing_assets.append(
                f"Asset {asset} appears {md_count} times in markdown "
                f"but only {html_count} times in HTML"
            )
        elif html_count == 0:
            missing_assets.append(
                f"Asset {asset} from markdown not found in HTML"
            )

    return missing_assets


# Characters that are acceptable before and after emphasis tags
PREV_EMPHASIS_CHARS = "  [(-—~×“=+‘"
NEXT_EMPHASIS_CHARS = "  ]).,;!?:-—~×”…=’"


def check_emphasis_spacing(soup: BeautifulSoup) -> List[str]:
    """
    Check for emphasis/strong elements that don't have proper spacing with
    surrounding text.
    """
    problematic_emphasis: List[str] = []

    # Properly escape characters for regex patterns
    _ok_prev_chars = "".join([re.escape(c) for c in PREV_EMPHASIS_CHARS])
    _ok_prev_regex = rf"^.*[{_ok_prev_chars}]$"

    _ok_next_chars = "".join([re.escape(c) for c in NEXT_EMPHASIS_CHARS])
    _ok_next_regex = rf"^[{_ok_next_chars}].*$"

    # Find all emphasis elements
    for element in soup.find_all(["em", "strong", "i", "b", "del"]):
        # Get the previous and next siblings that are text nodes
        prev_sibling = element.previous_sibling
        next_sibling = element.next_sibling

        # Check for missing space before the emphasis element
        if (
            isinstance(prev_sibling, NavigableString)
            and prev_sibling.strip()
            and not re.search(_ok_prev_regex, prev_sibling)
        ):
            preview = (
                f"{prev_sibling}<{element.name}>"
                f"{element.get_text()}</{element.name}>"
            )
            _add_to_list(
                problematic_emphasis, preview, prefix="Missing space before: "
            )

        # Check for missing space after the emphasis element
        if (
            isinstance(next_sibling, NavigableString)
            and next_sibling.strip()
            and not re.search(_ok_next_regex, next_sibling)
        ):
            preview = (
                f"<{element.name}>{element.get_text()}</{element.name}>"
                f"{next_sibling}"
            )
            _add_to_list(
                problematic_emphasis, preview, prefix="Missing space after: "
            )

    return problematic_emphasis


def main() -> None:
    """
    Check all HTML files in the public directory for issues.
    """
    public_dir: Path = git_root / "public"
    issues_found: bool = False

    check_rss_file_for_issues(git_root)

    md_dir: Path = git_root / "content"
    permalink_to_md_path_map = script_utils.build_html_to_md_map(md_dir)
    files_to_skip: Set[str] = script_utils.collect_aliases(md_dir)

    for root, _, files in os.walk(public_dir):
        if "drafts" in root:
            continue
        for file in tqdm.tqdm(files, desc="Webpages checked"):
            if file.endswith(".html") and Path(file).stem not in files_to_skip:
                file_path = Path(root) / file

                # Only derive md_path for public_dir files
                md_path = None
                if root.endswith("public"):
                    md_path = permalink_to_md_path_map.get(
                        file_path.stem
                    ) or permalink_to_md_path_map.get(file_path.stem.lower())
                    if not md_path and script_utils.should_have_md(file_path):
                        raise ValueError(
                            f"Markdown file for {file_path.stem} not found"
                        )

                issues = check_file_for_issues(file_path, public_dir, md_path)

                print_issues(file_path, issues)
                if any(lst for lst in issues.values()):
                    issues_found = True

    if issues_found:
        sys.exit(1)


if __name__ == "__main__":
    main()

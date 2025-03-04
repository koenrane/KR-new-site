# pylint: disable=C0302
"""
Script to check the built static site for common issues and errors.
"""

import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Dict, List, Literal, Set

import requests
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
    return not soup.select("article p img.favicon")


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


def check_invalid_internal_links(soup: BeautifulSoup) -> List[str]:
    """
    Check for links which do not have an href attribute or which start with
    "https://".
    """
    invalid_internal_links = []
    links = soup.find_all("a", class_="internal")
    for link in links:
        if not link.has_attr("href") or link["href"].startswith("https://"):
            invalid_internal_links.append(link)

    return invalid_internal_links


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
    Check for blockquote elements ending with ">" as long as they don't end in a
    "<\\w+>" pattern.
    """
    problematic_blockquotes: List[str] = []
    blockquotes = soup.find_all("blockquote")
    for blockquote in blockquotes:
        contents = list(blockquote.stripped_strings)
        if contents:
            last_part = contents[-1].strip()
            if last_part.endswith(">") and not re.search(r"<\w+>$", last_part):
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
    bad_anywhere = (r"> \[\![a-zA-Z]+\]",)  # Callout syntax
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
                        unrendered_spoilers,
                        text,
                        prefix="Unrendered spoiler: ",
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
    Check if the page has exactly one critical CSS block in the head.
    """
    head = soup.find("head")
    if isinstance(head, Tag):
        critical_css_blocks = head.find_all("style", {"id": "critical-css"})
        return len(critical_css_blocks) == 1
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


EMPHASIS_ELEMENTS_TO_SEARCH = (
    "p",
    "dt",
    "figcaption",
    "dd",
    "li",
    *(f"h{i}" for i in range(1, 7)),
)


def check_unrendered_emphasis(soup: BeautifulSoup) -> List[str]:
    """
    Check for any unrendered emphasis characters (* or _) in text content.
    Excludes code blocks, scripts, styles, and KaTeX elements.

    Args:
        soup: BeautifulSoup object to check

    Returns:
        List of strings containing problematic text with emphasis characters
    """
    problematic_texts: List[str] = []

    for text_elt in soup.find_all(EMPHASIS_ELEMENTS_TO_SEARCH):
        # Get text excluding code and KaTeX elements
        stripped_text = script_utils.get_non_code_text(text_elt)

        # Check for any * or _ characters, ignoring _ before %
        if stripped_text and (re.search(r"\*|_(?![_]* +%)", stripped_text)):
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
        if element.strip() and not should_skip(element):
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


# NOTE that this is in bytes, not characters
MAX_META_HEAD_SIZE = 9 * 1024  # 9 instead of 10 to avoid splitting tags


def meta_tags_early(file_path: Path) -> List[str]:
    """
    Check that meta and title tags are NOT present between MAX_HEAD_SIZE and
    </head>. EG Facebook only checks the first 10KB.

    Args:
        file_path: Path to the HTML file to check

    Returns:
        List of tags found after MAX_HEAD_SIZE but before </head>
    """
    issues: List[str] = []

    # Read entire HTML content first.
    # skipcq: PTC-W6004 - Only used for checks, not user-facing
    with open(file_path, "rb") as f:
        content_bytes = f.read()

    # If file is smaller than MAX_META_HEAD_SIZE, no issues possible
    if len(content_bytes) <= MAX_META_HEAD_SIZE:
        return []

    # Convert the first chunk and remainder to strings
    content = content_bytes.decode("utf-8")

    # Find where the byte boundary falls in terms of characters
    boundary_content = content_bytes[:MAX_META_HEAD_SIZE].decode("utf-8")
    char_boundary = len(boundary_content)

    # Consider everything past the byte boundary
    remainder = content[char_boundary:]

    # If no </head>, our checks don't apply
    if "</head>" not in remainder:
        return []

    # Only look up to the closing </head>
    head_content = remainder.split("</head>")[0]

    # Look for <meta ...> or <title ...> within that region
    for tag in ("meta", "title"):
        # Matches <meta ...> or </meta>, similarly for <title ...> or </title>
        pattern = rf"<{tag}[^>]*>"
        for match in re.finditer(pattern, head_content):
            tag_text = match.group(0)
            issues.append(
                f"<{tag}> tag found after first "
                f"{MAX_META_HEAD_SIZE // 1024}KB: {tag_text}"
            )

    return issues


def check_iframe_sources(soup: BeautifulSoup) -> List[str]:
    """
    Check that all iframe sources are responding with a successful status code.
    """
    problematic_iframes = []
    iframes = soup.find_all("iframe")

    for iframe in iframes:
        src = iframe.get("src")
        if not src:
            continue

        if src.startswith("//"):
            src = "https:" + src
        elif src.startswith("/"):
            continue  # Skip relative paths as they're checked by other fns

        title: str = iframe.get("title", "")
        alt: str = iframe.get("alt", "")
        description: str = f"{title=} ({alt=})"
        try:
            response = requests.head(src, timeout=10)
            if not response.ok:
                problematic_iframes.append(
                    f"Iframe source {src} returned status "
                    f"{response.status_code}. "
                    f"Description: {description}"
                )
        except requests.RequestException as e:
            problematic_iframes.append(
                f"Failed to load iframe source {src}: {str(e)}. "
                f"Description: {description}"
            )

    return problematic_iframes


def check_consecutive_periods(soup: BeautifulSoup) -> List[str]:
    """
    Check for consecutive periods in text content, including cases where they're
    separated by quotation marks.

    Returns:
        List of strings containing problematic text with consecutive periods
    """
    problematic_texts: List[str] = []

    for element in soup.find_all(string=True):
        if element.strip() and not should_skip(element):
            # Look for two periods with optional quote marks between
            if re.search(r'(?!\.\.\?)\.["“”]*\.', element.string):
                _add_to_list(
                    problematic_texts,
                    element.string,
                    prefix="Consecutive periods found: ",
                )

    return problematic_texts


def check_favicon_parent_elements(soup: BeautifulSoup) -> List[str]:
    """
    Check that all img.favicon elements are direct children of span elements.

    Returns:
        List of strings describing favicons that are not direct children of span elements.
    """
    problematic_favicons: List[str] = []

    for favicon in soup.select("img.favicon:not(.no-span)"):
        parent = favicon.parent
        if (
            not parent
            or parent.name != "span"
            or "favicon-span" not in (parent.get("class", []) or [])
        ):
            context = favicon.get("src", "unknown source")
            info = f"Favicon ({context}) is not a direct child of a span.favicon-span."
            if parent:
                info += " Instead, it's a child of "
                info += f"<{parent.name}>: {parent.get_text()}"
            problematic_favicons.append(info)

    return problematic_favicons


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
        "invalid_internal_links": check_invalid_internal_links(soup),
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
        "link_spacing": check_link_spacing(soup),
        "long_description": check_description_length(soup),
        "late_header_tags": meta_tags_early(file_path),
        "problematic_iframes": check_iframe_sources(soup),
        "consecutive_periods": check_consecutive_periods(soup),
        "invalid_favicon_parents": check_favicon_parent_elements(soup),
    }

    # Only check markdown assets if md_path exists and is a file
    if md_path and md_path.is_file():
        issues["missing_markdown_assets"] = check_markdown_assets_in_html(
            soup, md_path
        )

    if file_path.name == "about.html":  # Not all pages need to be checked
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


def strip_path(path_str: str) -> str:
    """
    Strip the git root path from a path string.
    """
    return path_str.strip(" .")


tags_to_check_for_missing_assets = ("img", "video", "svg", "audio", "source")


def get_md_asset_counts(md_path: Path) -> Counter[str]:
    """
    Get the counts of all assets referenced in the markdown file.
    """
    # skipcq: PTC-W6004, it's just serverside open -- not user-facing
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
        strip_path(asset) for asset in md_pattern_assets + tag_pattern_assets
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
                html_asset_counts[strip_path(src)] += 1

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


def check_spacing(
    element: Tag,
    allowed_chars: str,
    prefix: Literal["before", "after"],
) -> List[str]:
    """
    Check spacing between element and a sibling.
    """
    sibling = (
        element.previous_sibling if prefix == "before" else element.next_sibling
    )
    if not isinstance(sibling, NavigableString) or not sibling.strip():
        return []

    # Properly escape characters for regex pattern
    ok_chars = "".join([re.escape(c) for c in allowed_chars])
    ok_regex_chars = rf"[{ok_chars}]"
    ok_regex_expr = (
        rf"^.*{ok_regex_chars}$"
        if prefix == "before"
        else rf"^{ok_regex_chars}.*$"
    )

    if not re.search(ok_regex_expr, sibling, flags=re.MULTILINE):
        preview = f"<{element.name}>{element.get_text()}</{element.name}>"
        if prefix == "before":
            preview = f"{sibling.get_text()}{preview}"
        else:
            preview = f"{preview}{sibling.get_text()}"

        return [f"Missing space {prefix}: {preview}"]
    return []


ALLOWED_ELT_PRECEDING_CHARS = "[({-—~×“=+‘ \n\t\r"
ALLOWED_ELT_FOLLOWING_CHARS = "])}.,;!?:-—~×+”…=’ \n\t\r"


def _check_element_spacing(
    element: Tag,
    prev_allowed_chars: str,
    next_allowed_chars: str,
) -> List[str]:
    """
    Helper function to check spacing around HTML elements.

    Args:
        element: The HTML element to check
        prev_allowed_chars: Characters allowed before the element without space
        next_allowed_chars: Characters allowed after the element without space

    Returns:
        List of strings describing spacing issues
    """
    return check_spacing(element, prev_allowed_chars, "before") + check_spacing(
        element, next_allowed_chars, "after"
    )


def check_link_spacing(soup: BeautifulSoup) -> List[str]:
    """
    Check for non-footnote links that don't have proper spacing with surrounding
    text.

    Links should have a space before them unless preceded by specific
    characters.
    """
    problematic_links: List[str] = []

    # Find all links that aren't footnotes
    for link in soup.find_all("a"):
        # Skip footnote links
        if link.get("href", "").startswith("#user-content-fn"):
            continue

        problematic_links.extend(
            _check_element_spacing(
                link, ALLOWED_ELT_PRECEDING_CHARS, ALLOWED_ELT_FOLLOWING_CHARS
            )
        )

    return problematic_links


def check_emphasis_spacing(soup: BeautifulSoup) -> List[str]:
    """
    Check for emphasis/strong elements that don't have proper spacing with
    surrounding text.
    """
    problematic_emphasis: List[str] = []

    # Find all emphasis elements
    for element in soup.find_all(["em", "strong", "i", "b", "del"]):
        problematic_emphasis.extend(
            _check_element_spacing(
                element,
                ALLOWED_ELT_PRECEDING_CHARS,
                ALLOWED_ELT_FOLLOWING_CHARS,
            )
        )

    return problematic_emphasis


# Facebook recommends descriptions under 155 characters
MAX_DESCRIPTION_LENGTH = 155
MIN_DESCRIPTION_LENGTH = 10


def check_description_length(soup: BeautifulSoup) -> List[str]:
    """
    Check if the page description is within the recommended length for social
    media previews.

    Returns a list with a single string if the description is too long, or an
    empty list otherwise.
    """
    description_element = soup.find("meta", attrs={"name": "description"})
    description = (
        description_element.get("content")
        if description_element and isinstance(description_element, Tag)
        else None
    )

    if description:
        if len(description) > MAX_DESCRIPTION_LENGTH:
            return [
                f"Description too long: {len(description)} characters "
                f"(recommended <= {MAX_DESCRIPTION_LENGTH})"
            ]
        if len(description) < MIN_DESCRIPTION_LENGTH:
            return [
                f"Description too short: {len(description)} characters "
                f"(recommended >= {MIN_DESCRIPTION_LENGTH})"
            ]
        return []
    return ["Description not found"]


def check_css_issues(file_path: Path) -> List[str]:
    """
    Check for CSS issues in a file.
    """
    if not file_path.exists():
        return [f"CSS file {file_path} does not exist"]
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        if not re.search(r"@supports", content):
            return [
                f"CSS file {file_path.name} does not contain @supports,"
                " which is required for dropcaps in Firefox"
            ]
    return []


def main() -> None:
    """
    Check all HTML files in the public directory for issues.
    """
    public_dir: Path = git_root / "public"
    issues_found: bool = False

    # check_rss_file_for_issues(git_root)
    css_issues = check_css_issues(public_dir / "index.css")
    if css_issues:
        print_issues(public_dir / "index.css", {"CSS_issues": css_issues})
        issues_found = True

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

                if any(lst for lst in issues.values()):
                    print_issues(file_path, issues)
                    issues_found = True

    if issues_found:
        sys.exit(1)


if __name__ == "__main__":
    main()

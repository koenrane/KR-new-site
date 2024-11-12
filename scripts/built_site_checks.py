import os
import sys
import subprocess
import re
from typing import List, Dict
from pathlib import Path
from bs4 import BeautifulSoup

# Add the project root to sys.path
sys.path.append(str(Path(__file__).parent.parent))

import scripts.compress as compress
import scripts.utils as script_utils


git_root = script_utils.get_git_root()
RSS_XSD_PATH = git_root / "scripts" / ".rss-2.0.xsd"

IssuesDict = Dict[str, List[str] | bool]


def check_localhost_links(soup: BeautifulSoup) -> List[str]:
    """Check for localhost links in the HTML."""
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
    """Check if favicons are missing."""
    return soup.find("img", class_="favicon") is None


def check_unrendered_footnotes(soup: BeautifulSoup) -> List[str]:
    """
    Check for unrendered footnotes in the format [^something].
    Returns a list of the footnote references themselves.
    """
    footnote_pattern = r"\[\^[a-zA-Z0-9-_]+\]"  # Matches [^1], [^note], [^note-1], etc.
    unrendered_footnotes = []

    for p in soup.find_all("p"):
        matches = re.findall(footnote_pattern, p.text)
        if matches:
            unrendered_footnotes.extend(matches)

    return unrendered_footnotes


def check_invalid_anchors(
    soup: BeautifulSoup, file_path: Path, base_dir: Path
) -> List[str]:
    """Check for invalid internal anchor links in the HTML."""
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


# Check that no blockquote element ends with ">" (probably needed a newline before it)
def check_blockquote_elements(soup: BeautifulSoup) -> List[str]:
    """Check for blockquote elements ending with ">"."""
    problematic_blockquotes: List[str] = []
    blockquotes = soup.find_all("blockquote")
    for blockquote in blockquotes:
        # Get the last non-empty string content of the blockquote
        contents = [s for s in blockquote.stripped_strings]
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
    """Check for paragraphs starting with specific phrases."""
    problematic_paragraphs = []
    paragraphs = soup.find_all("p")
    for p in paragraphs:
        text = p.get_text().strip()
        if any(prefix in text for prefix in ("Table: ", "Figure: ", "Code: ")):
            problematic_paragraphs.append(text[:50] + "..." if len(text) > 50 else text)
    return problematic_paragraphs


def check_unrendered_subtitles(soup: BeautifulSoup) -> List[str]:
    """Check for unrendered subtitle lines."""
    unrendered_subtitles = []
    paragraphs = soup.find_all("p")
    for p in paragraphs:
        text = p.get_text().strip()
        if text.startswith("Subtitle:") and "subtitle" not in p.get("class", []):
            unrendered_subtitles.append(text[:50] + "..." if len(text) > 50 else text)
    return unrendered_subtitles


def parse_html_file(file_path: Path) -> BeautifulSoup:
    """Parse an HTML file and return a BeautifulSoup object."""
    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()
    return BeautifulSoup(content, "html.parser")


# Check the existence of local files with these extensions
_MEDIA_EXTENSIONS = list(compress.ALLOWED_EXTENSIONS) + [".svg", ".avif", ".ico"]


def check_local_media_files(
    soup: BeautifulSoup, file_path: Path, base_dir: Path
) -> List[str]:
    """Check for local media files (images, videos, SVGs) and verify their existence."""
    missing_files = []
    media_tags = soup.find_all(["img", "video", "source", "svg"])

    for tag in media_tags:
        src = tag.get("src") or tag.get("href")
        if src and not src.startswith(("http://", "https://")):
            # It's a local file
            file_extension = Path(src).suffix.lower()
            if file_extension in _MEDIA_EXTENSIONS:
                full_path = (base_dir / src).resolve()
                if not full_path.is_file():
                    missing_files.append(src)

    return missing_files


def check_asset_references(
    soup: BeautifulSoup, file_path: Path, base_dir: Path
) -> List[str]:
    """Check for asset references and verify their existence."""
    missing_assets = []

    def resolve_asset_path(href: str) -> Path:
        if href.startswith("/"):
            # Absolute path within the site
            return (base_dir / href.lstrip("/")).resolve()
        else:
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
        if "stylesheet" in rel or ("preload" in rel and link.get("as") == "style"):
            check_asset(link.get("href"))

    # Check script tags for JS files
    for script in soup.find_all("script", src=True):
        check_asset(script["src"])

    return missing_assets


def check_katex_elements_for_errors(soup: BeautifulSoup) -> List[str]:
    """Check for KaTeX elements with color #cc0000."""
    problematic_katex = []
    katex_elements = soup.select(".katex")
    for element in katex_elements:
        error_span = element.select_one('span[style*="color:#cc0000"]')
        if error_span:
            content = element.get_text().strip()
            problematic_katex.append(
                f"KaTeX element: {content[:50]}..." if len(content) > 50 else content
            )
    return problematic_katex


def check_file_for_issues(file_path: Path, base_dir: Path) -> IssuesDict:
    """Check a single HTML file for various issues."""
    soup = parse_html_file(file_path)
    issues: IssuesDict = {
        "localhost_links": check_localhost_links(soup),
        "invalid_anchors": check_invalid_anchors(soup, file_path, base_dir),
        "problematic_paragraphs": check_problematic_paragraphs(soup),
        "missing_media_files": check_local_media_files(soup, file_path, base_dir),
        "trailing_blockquotes": check_blockquote_elements(soup),
        "missing_assets": check_asset_references(soup, file_path, base_dir),
        "problematic_katex": check_katex_elements_for_errors(soup),
        "unrendered_subtitles": check_unrendered_subtitles(soup),
        "unrendered_footnotes": check_unrendered_footnotes(soup),
    }
    if "test-page" in file_path.name:
        issues["missing_favicon"] = check_favicons_missing(soup)
    return issues


def check_rss_file_for_issues(
    git_root_path: Path, custom_xsd_path: Path | None = None
) -> None:
    """Check an RSS file for various issues.
    Uses xmllint via `brew install libxml2`."""
    rss_path = git_root_path / "public" / "rss.xml"
    subprocess.run(
        [
            "xmllint",
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
    """Print issues found in a file."""
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
    """Main function to check all HTML files in the public directory for issues."""
    git_root = script_utils.get_git_root()
    public_dir: Path = git_root / "public"
    issues_found: bool = False

    check_rss_file_for_issues(git_root)

    for root, dirs, files in os.walk(public_dir):
        for file in files:
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

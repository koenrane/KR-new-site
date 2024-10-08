import os
import sys
from typing import List, Tuple
from pathlib import Path
from bs4 import BeautifulSoup, Tag

# Add the project root to sys.path
sys.path.append(str(Path(__file__).parent.parent))

import scripts.compress as compress
import scripts.utils as script_utils


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


def check_problematic_paragraphs(soup: BeautifulSoup) -> List[str]:
    """Check for paragraphs starting with specific phrases."""
    problematic_paragraphs = []
    paragraphs = soup.find_all("p")
    for p in paragraphs:
        text = p.get_text().strip()
        if any(prefix in text for prefix in ("Table: ", "Figure: ", "Code: ")):
            problematic_paragraphs.append(text[:50] + "..." if len(text) > 50 else text)
    return problematic_paragraphs


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


def check_file_for_issues(
    file_path: Path, base_dir: Path
) -> Tuple[List[str], List[str], List[str], List[str]]:
    """Check a single HTML file for various issues."""
    soup = parse_html_file(file_path)
    localhost_links = check_localhost_links(soup)
    invalid_anchors = check_invalid_anchors(soup, file_path, base_dir)
    problematic_paragraphs = check_problematic_paragraphs(soup)
    missing_media_files = check_local_media_files(soup, file_path, base_dir)
    return localhost_links, invalid_anchors, problematic_paragraphs, missing_media_files


def print_issues(
    file_path: Path,
    localhost_links: List[str],
    invalid_anchors: List[str],
    problematic_paragraphs: List[str],
    missing_media_files: List[str],
) -> None:
    """Print issues found in a file."""
    if (
        localhost_links
        or invalid_anchors
        or problematic_paragraphs
        or missing_media_files
    ):
        print(f"Issues found in {file_path}:")

        if localhost_links:
            print("  Localhost links:")
            for link in localhost_links:
                print(f"    - {link}")

        if invalid_anchors:
            print("  Invalid internal anchors:")
            for anchor in invalid_anchors:
                print(f"    - {anchor}")

        if problematic_paragraphs:
            print("  Paragraphs starting with 'Table:', 'Figure:', or 'Code:':")
            for paragraph in problematic_paragraphs:
                print(f"    - {paragraph}")

        if missing_media_files:
            print("  Missing local media files:")
            for file in missing_media_files:
                print(f"    - {file}")

        print()  # Add a blank line between files with issues


def main() -> None:
    """Main function to check all HTML files in the public directory for issues."""
    git_root = script_utils.get_git_root()
    if git_root is None:
        print("Error: Not in a git repository.")
        sys.exit(1)

    public_dir: Path = Path(git_root, "public")
    issues_found: bool = False

    for root, dirs, files in os.walk(public_dir):
        for file in files:
            if file.endswith(".html"):
                file_path = Path(root) / file
                (
                    localhost_links,
                    invalid_anchors,
                    problematic_paragraphs,
                    missing_media_files,
                ) = check_file_for_issues(file_path, public_dir)

                if (
                    localhost_links
                    or invalid_anchors
                    or problematic_paragraphs
                    or missing_media_files
                ):
                    print_issues(
                        file_path,
                        localhost_links,
                        invalid_anchors,
                        problematic_paragraphs,
                        missing_media_files,
                    )
                    issues_found = True

    if issues_found:
        sys.exit(1)


if __name__ == "__main__":
    main()

import subprocess
import sys
from pathlib import Path
from typing import List

import pytest
import requests
from bs4 import BeautifulSoup, Tag

from ..utils import get_git_root

sys.path.append(str(Path(__file__).parent.parent))

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..built_site_checks import *
else:
    from built_site_checks import *


@pytest.mark.parametrize(
    "input_path,expected",
    [
        # Basic stripping of spaces and dots
        (" path/to/file ", "path/to/file"),
        (".path/to/file", "path/to/file"),
        ("path/to/file.", "path/to/file"),
        # Multiple dots and spaces
        ("  ./path/to/file.  ", "/path/to/file"),
        ("...path/to/file...", "path/to/file"),
        # Empty or whitespace-only strings
        ("", ""),
        (" ", ""),
        (".", ""),
        ("  .  ", ""),
        # Paths with valid dots
        ("path/to/file.txt", "path/to/file.txt"),
        ("path.to/file.txt", "path.to/file.txt"),
        # Mixed cases
        (" .path.to/file.txt. ", "path.to/file.txt"),
        ("  ...  path/to/file  ...  ", "path/to/file"),
    ],
)
def test_strip_path(input_path: str, expected: str) -> None:
    """Test the strip_path function with various input paths."""
    assert strip_path(input_path) == expected


@pytest.fixture
def sample_html():
    return """
    <html>
    <body>
        <a href="http://localhost:8000">Localhost Link</a>
        <a href="https://turntrout.com">Turntrout Link</a>
        <a href="/other-page#invalid-anchor">Turntrout Link with Anchor</a>
        <a href="#valid-anchor">Valid Anchor</a>
        <a href="#invalid-anchor">Invalid Anchor</a>
        <div id="valid-anchor">Valid Anchor Content</div>
        <p>Normal paragraph</p>
        <p>Table: This is a table description</p>
        <p>This is a delayed-paragraph Table: </p>
        <p>Figure: This is a figure caption</p>
        <p>Code: This is a code snippet</p>
        <img src="existing-image.jpg" alt="Existing Image">
        <img src="missing-image.png" alt="Missing Image">
        <video src="existing-video.mp4"></video>
        <svg src="missing-svg.svg"></svg>
    </body>
    </html>
    """


@pytest.fixture
def sample_html_with_katex_errors():
    return """
    <html>
    <body>
        <span class="katex-error">\\rewavcxx</span>
    </body>
    </html>
    """


@pytest.fixture
def sample_soup(sample_html):
    return BeautifulSoup(sample_html, "html.parser")


@pytest.fixture
def temp_site_root(tmp_path):
    return tmp_path


@pytest.fixture
def sample_html_with_assets():
    return """
    <html>
    <head>
        <link rel="stylesheet" href="/styles/main.css">
        <link rel="preload" href="./index.css" as="style" onload="this.rel='stylesheet'">
        <script src="/js/script.js"></script>
    </head>
    <body>
        <img src="../images/photo.jpg">
    </body>
    </html>
    """


@pytest.fixture
def sample_soup_with_assets(sample_html_with_assets):
    return BeautifulSoup(sample_html_with_assets, "html.parser")


def test_check_localhost_links(sample_soup):
    result = check_localhost_links(sample_soup)
    assert result == ["http://localhost:8000"]


def test_check_invalid_anchors(sample_soup, temp_site_root):
    result = check_invalid_anchors(sample_soup, temp_site_root)
    assert set(result) == {"#invalid-anchor", "/other-page#invalid-anchor"}


def test_check_problematic_paragraphs(sample_soup):
    result = check_problematic_paragraphs(sample_soup)
    assert len(result) == 3
    assert "Problematic paragraph: Table: This is a table description" in result
    assert "Problematic paragraph: Figure: This is a figure caption" in result
    assert "Problematic paragraph: Code: This is a code snippet" in result
    assert "Problematic paragraph: Normal paragraph" not in result
    assert (
        "Problematic paragraph: This is a delayed-paragraph Table: "
        not in result
    )


def test_check_problematic_paragraphs_with_direct_text():
    html = """
    <html>
    <body>
        <article>
            Figure: Text
            <p>Normal paragraph</p>
            <blockquote>Figure: Blockquote</blockquote>
        </article>
    </body>
    </html>
    """
    soup = BeautifulSoup(html, "html.parser")
    result = check_problematic_paragraphs(soup)
    assert "Problematic paragraph: Figure: Text" in result
    assert "Problematic paragraph: Figure: Blockquote" in result
    assert "Problematic paragraph: Normal paragraph" not in result


def test_check_katex_elements_for_errors(sample_html_with_katex_errors):
    html = BeautifulSoup(sample_html_with_katex_errors, "html.parser")
    result = check_katex_elements_for_errors(html)
    assert result == ["KaTeX error: \\rewavcxx"]


@pytest.mark.parametrize(
    "input_path,expected_path",
    [
        # Test absolute path
        ("/images/test.jpg", "images/test.jpg"),
        # Test relative path with ./
        ("./images/test.jpg", "images/test.jpg"),
        # Test path without leading ./ or /
        ("images/test.jpg", "images/test.jpg"),
        # Test nested paths
        ("/deep/nested/path/image.png", "deep/nested/path/image.png"),
        # Test current directory
        ("./file.jpg", "file.jpg"),
        # Test file in root
        ("/file.jpg", "file.jpg"),
    ],
)
def test_resolve_media_path(input_path, expected_path, temp_site_root):
    """Test the resolve_media_path helper function."""
    result = resolve_media_path(input_path, temp_site_root)
    assert result == (temp_site_root / expected_path).resolve()


def test_check_local_media_files(sample_soup, temp_site_root):
    # Create an existing image file
    (temp_site_root / "existing-image.jpg").touch()
    (temp_site_root / "existing-video.mp4").touch()

    result = check_local_media_files(sample_soup, temp_site_root)
    assert set(result) == {
        "missing-image.png (resolved to "
        + str((temp_site_root / "missing-image.png").resolve())
        + ")",
        "missing-svg.svg (resolved to "
        + str((temp_site_root / "missing-svg.svg").resolve())
        + ")",
    }


@pytest.mark.parametrize(
    "html,expected,existing_files",
    [
        ('<img src="local.jpg">', ["local.jpg (resolved to {})"], []),
        ('<img src="https://example.com/image.png">', [], []),
        (
            '<video src="video.mp4"></video>',
            ["video.mp4 (resolved to {})"],
            [],
        ),
        ('<svg src="icon.svg"></svg>', ["icon.svg (resolved to {})"], []),
        ('<img src="existing.png">', [], ["existing.png"]),
    ],
)
def test_check_local_media_files_parametrized(
    html, expected, existing_files, temp_site_root
):
    # Create any existing files
    for file in existing_files:
        (temp_site_root / file).touch()

    soup = BeautifulSoup(html, "html.parser")
    result = check_local_media_files(soup, temp_site_root)

    # Format the expected paths with the actual resolved paths
    expected = [
        exp.format(
            str((temp_site_root / exp.split(" (resolved to ")[0]).resolve())
        )
        for exp in expected
    ]

    assert result == expected


def test_check_file_for_issues(tmp_path):
    """Test check_file_for_issues function."""
    file_path = tmp_path / "test.html"
    file_path.write_text(
        """
    <html>
    <body>
        <a href="https://localhost:8000">Localhost Link</a>
        <a href="#invalid-anchor">Invalid Anchor</a>
        <p>Table: Test table</p>
        <img src="missing-image.jpg" alt="Missing Image">
        <img src="https://example.com/image.png" alt="External Image">
        <blockquote>This is a blockquote</blockquote>
        <blockquote>This is a problematic blockquote ></blockquote>
        <blockquote>This ending tag is fine<BOS></blockquote>
        <p>Subtitle: Unrendered subtitle</p>
        <p class="subtitle">Rendered subtitle</p>
    </body>
    </html>
    """
    )
    issues = check_file_for_issues(file_path, tmp_path, tmp_path / "content")
    assert issues["localhost_links"] == ["https://localhost:8000"]
    assert issues["invalid_anchors"] == ["#invalid-anchor"]
    assert issues["problematic_paragraphs"] == [
        "Problematic paragraph: Table: Test table"
    ]
    expected_missing = [
        f"missing-image.jpg (resolved to {(tmp_path / 'missing-image.jpg').resolve()})"
    ]
    assert issues["missing_media_files"] == expected_missing


complicated_blockquote = """
<blockquote class="callout quote" data-callout="quote">
<div class="callout-title"><div class="callout-icon"></div><div class="callout-title-inner"> <a href="https://www.lesswrong.com/posts/2JJtxitp6nqu6ffak/basic-facts-about-language-models-during-training-1#Residual_stream_outliers_grow_rapidly_then_stabilize_and_decline" class="external alias" target="_blank">Basic facts about language models during trai<span style="white-space:nowrap;">ning<img src="https://assets.turntrout.com/static/images/external-favicons/lesswrong_com.avif" class="favicon" alt=""></span></a> &gt; <img src="https://assets.turntrout.com/static/images/posts/m1uteifqbbyox6qp9xnx.avif" alt="" loading="lazy"></div></div>
</blockquote>
"""


def test_complicated_blockquote(tmp_path):
    file_path = tmp_path / "test.html"
    file_path.write_text(complicated_blockquote)
    issues = check_file_for_issues(file_path, tmp_path, tmp_path / "content")
    assert issues["trailing_blockquotes"] == [
        "Problematic blockquote: Basic facts about language models during trai ning >"
    ]


def test_check_file_for_issues_with_redirect(tmp_path):
    file_path = tmp_path / "test.html"
    file_path.write_text(
        '<html><head><meta http-equiv="refresh" content="0;url=/new-page"></head></html>'
    )
    issues = check_file_for_issues(file_path, tmp_path, tmp_path / "content")
    assert issues == {}


@pytest.mark.parametrize(
    "html,expected",
    [
        # Test favicon inside article and p tag (valid)
        (
            '<html><body><article><p><img class="favicon" src="favicon.ico"></p></article></body></html>',
            False,
        ),
        # Test favicon missing article tag (invalid)
        (
            '<html><body><p><img class="favicon" src="favicon.ico"></p></body></html>',
            True,
        ),
        # Test favicon missing p tag (invalid)
        (
            '<html><body><article><img class="favicon" src="favicon.ico"></article></body></html>',
            True,
        ),
        # Test no favicon at all (invalid)
        (
            '<html><head><link rel="stylesheet" href="style.css"></head><body></body></html>',
            True,
        ),
        # Test empty page (invalid)
        (
            "<html><head></head><body></body></html>",
            True,
        ),
    ],
)
def test_check_favicons_missing(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = check_favicons_missing(soup)
    assert result == expected


def test_check_unrendered_subtitles():
    html = """
    <html>
    <body>
        <p>Normal paragraph</p>
        <p>Subtitle: This should be a subtitle</p>
        <p class="subtitle">This is a properly rendered subtitle</p>
        <p>Subtitle: Another unrendered subtitle</p>
    </body>
    </html>
    """
    soup = BeautifulSoup(html, "html.parser")
    result = check_unrendered_subtitles(soup)
    assert result == [
        "Unrendered subtitle: Subtitle: This should be a subtitle",
        "Unrendered subtitle: Subtitle: Another unrendered subtitle",
    ]


def test_check_rss_file_for_issues_with_actual_xmllint(temp_site_root):
    """
    Test that check_rss_file_for_issues runs the actual xmllint process on valid
    and invalid RSS files.

    Note: This test requires xmllint to be installed on the system.
    """
    # Get the real git root
    get_git_root()

    # Define paths for rss.xml and rss-2.0.xsd
    rss_path = temp_site_root / "public" / "rss.xml"

    # Create necessary directory
    rss_path.parent.mkdir(parents=True, exist_ok=True)

    # Define valid and invalid RSS content
    valid_rss_content = """<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>Example RSS Feed</title>
        <link>http://www.example.com</link>
        <description>This is an example RSS feed</description>
        <item>
          <title>First Item</title>
          <link>http://www.example.com/first-item</link>
          <description>This is the first item.</description>
        </item>
      </channel>
    </rss>
    """

    invalid_rss_content = """<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
      <channel>
        <title>Invalid RSS Feed</title>
        <!-- Missing <link> and <description> -->
        <item>
          <title>First Item</title>
          <link>http://www.example.com/first-item</link>
          <description>This is the first item.</description>
        </item>
      </channel>
    </rss>
    """

    # Test with valid RSS
    rss_path.write_text(valid_rss_content)
    try:
        check_rss_file_for_issues(temp_site_root, RSS_XSD_PATH)
    except subprocess.CalledProcessError:
        pytest.fail(
            "check_rss_file_for_issues raised CalledProcessError unexpectedly with valid RSS!"
        )

    # Test with invalid RSS and expect an exception
    rss_path.write_text(invalid_rss_content)
    with pytest.raises(subprocess.CalledProcessError):
        check_rss_file_for_issues(temp_site_root, RSS_XSD_PATH)


def test_check_unrendered_footnotes():
    html = """
    <html>
    <body>
        <p>Normal paragraph</p>
        <p>Text with [^1] unrendered footnote</p>
        <p>Another [^note] footnote reference</p>
        <p>Not a [^] footnote</p>
        <p>Regular [text] in brackets</p>
    </body>
    </html>
    """
    soup = BeautifulSoup(html, "html.parser")
    result = check_unrendered_footnotes(soup)
    assert result == ["[^1]", "[^note]"]


@pytest.mark.parametrize(
    "html,expected",
    [
        ("<p>Text with [^1] footnote</p>", ["[^1]"]),
        ("<p>Multiple [^1] [^2] footnotes</p>", ["[^1]", "[^2]"]),
        ("<p>No footnotes here</p>", []),
        ("<p>Not a [^] footnote</p>", []),
        ("<p>Regular [text] in brackets</p>", []),
    ],
)
def test_check_unrendered_footnotes_parametrized(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = check_unrendered_footnotes(soup)
    assert result == expected


@pytest.mark.parametrize(
    "html,expected",
    [
        # Test basic duplicate ID
        (
            """
            <div id="test"></div>
            <div id="test"></div>
            """,
            ["test (found 2 times)"],
        ),
        # Test ID with numbered variant
        (
            """
            <div id="test"></div>
            <div id="test-1"></div>
            """,
            ["test (found 2 times, including numbered variants)"],
        ),
        # Test multiple numbered variants
        (
            """
            <div id="test"></div>
            <div id="test-1"></div>
            <div id="test-2"></div>
            """,
            ["test (found 3 times, including numbered variants)"],
        ),
        # Test multiple issues
        (
            """
            <div id="test"></div>
            <div id="test"></div>
            <div id="other"></div>
            <div id="other-1"></div>
            """,
            [
                "test (found 2 times)",
                "other (found 2 times, including numbered variants)",
            ],
        ),
        # Test flowchart exclusion
        (
            """
            <div class="flowchart">
                <div id="test"></div>
                <div id="test"></div>
            </div>
            <div id="test"></div>
            """,
            [],  # IDs in flowcharts should be ignored
        ),
        # Test no duplicates
        (
            """
            <div id="test1"></div>
            <div id="test2"></div>
            """,
            [],
        ),
    ],
)
def test_check_duplicate_ids(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = check_duplicate_ids(soup)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "html,expected",
    [
        # Test footnote references (should be allowed to have duplicates)
        (
            """
            <p><a id="user-content-fnref-crux"></a>First reference</p>
            <p><a id="user-content-fnref-crux"></a>Second reference</p>
            <p><a id="user-content-fn-1"></a>The footnote</p>
            """,
            [],  # No issues reported for duplicate fnref IDs
        ),
        # Test mixed footnote and regular IDs
        (
            """
            <p><a id="user-content-fnref-1"></a>First reference</p>
            <p><a id="user-content-fnref-1"></a>Second reference</p>
            <p id="test">Test</p>
            <p id="test">Duplicate test</p>
            """,
            ["test (found 2 times)"],  # Only regular duplicate ID is reported
        ),
        # Test footnote content IDs (should flag duplicates)
        (
            """
            <p><a id="user-content-fn-1"></a>First footnote</p>
            <p><a id="user-content-fn-1"></a>Duplicate footnote</p>
            """,
            [
                "user-content-fn-1 (found 2 times)"
            ],  # Duplicate footnote content IDs should be reported
        ),
    ],
)
def test_check_duplicate_ids_with_footnotes(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = check_duplicate_ids(soup)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "html,expected",
    [
        # Test basic paragraph cases
        (
            """
            <p>Normal paragraph</p>
            <p>Table: Test table</p>
            """,
            ["Problematic paragraph: Table: Test table"],
        ),
        # Test definition term cases
        (
            """
            <dt>Normal term</dt>
            <dt>: Invalid term</dt>
            """,
            ["Problematic paragraph: : Invalid term"],
        ),
        # Test mixed cases
        (
            """
            <p>Table: Test table</p>
            <dt>: Invalid term</dt>
            <p>Normal paragraph</p>
            <dt>Normal term</dt>
            """,
            [
                "Problematic paragraph: Table: Test table",
                "Problematic paragraph: : Invalid term",
            ],
        ),
        # Test empty elements
        (
            """
            <p></p>
            <dt></dt>
            """,
            [],
        ),
    ],
)
def test_check_problematic_paragraphs_with_dt(html, expected):
    """Check that unrendered description list entries are flagged."""
    soup = BeautifulSoup(html, "html.parser")
    result = check_problematic_paragraphs(soup)
    assert sorted(result) == sorted(expected)


def test_check_unrendered_spoilers():
    html = """
    <html>
    <body>
        <blockquote>
            <p>! This is an unrendered spoiler.</p>
            <p>This is normal text.</p>
        </blockquote>
        <blockquote>
            <p>This is a regular blockquote.</p>
        </blockquote>
        <p>! Outside of blockquote should not be detected.</p>
    </body>
    </html>
    """
    soup = BeautifulSoup(html, "html.parser")
    result = check_unrendered_spoilers(soup)
    assert result == ["Unrendered spoiler: ! This is an unrendered spoiler."]


@pytest.mark.parametrize(
    "html,expected",
    [
        # Test unrendered spoiler inside blockquote
        (
            """
            <blockquote>
                <p>! Spoiler text here.</p>
            </blockquote>
            """,
            ["Unrendered spoiler: ! Spoiler text here."],
        ),
        # Test multiple unrendered spoilers
        (
            """
            <blockquote>
                <p>! First spoiler.</p>
                <p>! Second spoiler.</p>
            </blockquote>
            """,
            [
                "Unrendered spoiler: ! First spoiler.",
                "Unrendered spoiler: ! Second spoiler.",
            ],
        ),
        # Test no unrendered spoilers
        (
            """
            <blockquote>
                <p>This is a regular paragraph.</p>
            </blockquote>
            """,
            [],
        ),
        # Test unrendered spoiler not in blockquote (should not be detected)
        (
            """
            <p>! This should not be detected.</p>
            """,
            [],
        ),
        # Test text node directly inside blockquote
        (
            """
            <blockquote>
                ! This is a text node, not inside a <p> tag.
                <p>This should not be detected.</p>
            </blockquote>
            """,
            [],
        ),
    ],
)
def test_check_unrendered_spoilers_parametrized(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = check_unrendered_spoilers(soup)
    assert result == expected


@pytest.mark.parametrize(
    "html,expected",
    [
        # Test unrendered heading
        (
            """
            <p># Unrendered heading</p>
            <p>## Another unrendered heading</p>
            <p>Normal paragraph</p>
            """,
            [
                "Problematic paragraph: # Unrendered heading",
                "Problematic paragraph: ## Another unrendered heading",
            ],
        ),
        # Test mixed problematic cases
        (
            """
            <p># Heading</p>
            <p>Table: Description</p>
            <p>Normal text</p>
            """,
            [
                "Problematic paragraph: # Heading",
                "Problematic paragraph: Table: Description",
            ],
        ),
        # Test heading-like content mid-paragraph (should not be detected)
        (
            """
            <p>This is not a # heading</p>
            <p>Also not a ## heading</p>
            """,
            [],
        ),
    ],
)
def test_check_problematic_paragraphs_with_headings(html, expected):
    """Check that unrendered headings (paragraphs starting with #) are flagged."""
    soup = BeautifulSoup(html, "html.parser")
    result = check_problematic_paragraphs(soup)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "html,expected",
    [
        # Test bad_anywhere patterns
        (
            """
            <p>> [!warning] Alert text</p>
            """,
            [
                "Problematic paragraph: > [!warning] Alert text",
            ],
        ),
        # Test direct text in article and blockquote
        (
            """
            <article>
                Table: Direct text in article
                <p>Normal paragraph</p>
            </article>
            <blockquote>
                Figure: Direct text in blockquote
                <p>Normal paragraph</p>
            </blockquote>
            """,
            [
                "Problematic paragraph: Table: Direct text in article",
                "Problematic paragraph: Figure: Direct text in blockquote",
            ],
        ),
        # Test code tag exclusions
        (
            """
            <p>Normal text <code>Table: This should be ignored</code></p>
            <p><code>Figure: Also ignored</code> but Table: this isn't</p>
            """,
            ["Problematic paragraph: but Table: this isn't"],
        ),
        # Test nested structures
        (
            """
            <article>
                <blockquote>
                    Table: Nested text
                    <p>Normal paragraph</p>
                    <p>Table: In paragraph</p>
                </blockquote>
                Figure: More direct text
            </article>
            """,
            [
                "Problematic paragraph: Table: Nested text",
                "Problematic paragraph: Table: In paragraph",
                "Problematic paragraph: Figure: More direct text",
            ],
        ),
        # Test bad paragraph starting prefixes
        (
            """
            <p>: Invalid prefix</p>
            <p># Unrendered heading</p>
            <p>## Another heading</p>
            <p>Normal: text</p>
            """,
            [
                "Problematic paragraph: : Invalid prefix",
                "Problematic paragraph: # Unrendered heading",
                "Problematic paragraph: ## Another heading",
            ],
        ),
        # Test mixed content with code blocks
        (
            """
            <p>
                <code>Table: Ignored</code>
                Table: Not ignored
                <code>Figure: Also ignored</code>
            </p>
            """,
            ["Problematic paragraph: Table: Not ignored"],
        ),
        # Test text nodes in different contexts
        (
            """
            <p>Text before <em>Table: problematic</em></p>
            <p>Text before <em>Figure: also problematic</em></p>
            <p>Text before <em>Code: still problematic</em></p>
            """,
            [
                "Problematic paragraph: Table: problematic",
                "Problematic paragraph: Figure: also problematic",
                "Problematic paragraph: Code: still problematic",
            ],
        ),
        # Test edge cases with special characters
        (
            """
            <p>> [!note] With spaces</p>
            """,
            [
                "Problematic paragraph: > [!note] With spaces",
            ],
        ),
    ],
)
def test_check_problematic_paragraphs_comprehensive(html, expected):
    """Comprehensive test suite for check_problematic_paragraphs function."""
    soup = BeautifulSoup(html, "html.parser")
    result = check_problematic_paragraphs(soup)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "html,expected",
    [
        # Basic emphasis cases
        (
            "<p>Text with *asterisk*</p>",
            ["Unrendered emphasis: Text with *asterisk*"],
        ),
        (
            "<p>Text with _underscore_</p>",
            ["Unrendered emphasis: Text with _underscore_"],
        ),
        # Percentage cases (should be ignored)
        ("<p>Text with ___ % coverage</p>", []),
        # Mixed cases
        (
            "<p>Mixed *emphasis* with _100% value_</p>",
            ["Unrendered emphasis: Mixed *emphasis* with _100% value_"],
        ),
        # Code and KaTeX exclusions
        (
            "<p>Text with <code>*ignored*</code> and *emphasis*</p>",
            ["Unrendered emphasis: Text with  and *emphasis*"],
        ),
        (
            "<p>Math <span class='katex'>*x*</span> and *emphasis*</p>",
            ["Unrendered emphasis: Math  and *emphasis*"],
        ),
        # Multiple elements
        (
            """
            <div>
                <p>First *paragraph*</p>
                <h1>Heading with _emphasis_</h1>
                <figcaption>Caption with *stars*</figcaption>
            </div>
        """,
            [
                "Unrendered emphasis: First *paragraph*",
                "Unrendered emphasis: Heading with _emphasis_",
                "Unrendered emphasis: Caption with *stars*",
            ],
        ),
        # Edge cases
        (
            "<p>Text_with_multiple_underscores</p>",
            ["Unrendered emphasis: Text_with_multiple_underscores"],
        ),
        (
            "<p>Text*with*multiple*asterisks</p>",
            ["Unrendered emphasis: Text*with*multiple*asterisks"],
        ),
        (
            "<p>Unicode: 你好 *emphasis* 再见</p>",
            ["Unrendered emphasis: Unicode: 你好 *emphasis* 再见"],
        ),
        (
            "<p>HTML &amp; *emphasis*</p>",
            ["Unrendered emphasis: HTML & *emphasis*"],
        ),
    ],
)
def test_check_unrendered_emphasis(html, expected):
    """Test the check_unrendered_emphasis function."""
    soup = BeautifulSoup(html, "html.parser")
    result = check_unrendered_emphasis(soup)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "html,expected",
    [
        # Test KaTeX display starting with >> outside blockquote
        (
            """
            <span class="katex-display">>> Some definition</span>
            """,
            ["KaTeX error: >> Some definition"],
        ),
        # Test KaTeX display without >>
        (
            """
            <span class="katex-display">x + y = z</span>
            """,
            [],
        ),
        # Test multiple KaTeX displays
        (
            """
            <span class="katex-display">>> First definition</span>
            <span class="katex-display">Normal equation</span>
            <span class="katex-display">> Second definition</span>
            """,
            [
                "KaTeX error: >> First definition",
                "KaTeX error: > Second definition",
            ],
        ),
    ],
)
def test_katex_element_surrounded_by_blockquote(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = katex_element_surrounded_by_blockquote(soup)
    assert result == expected


@pytest.mark.parametrize(
    "html,expected",
    [
        # Basic straight quotes that should be caught
        (
            '<p>Text with "quotes"</p>',
            ["Unprocessed quotes ['\"', '\"']: Text with \"quotes\""],
        ),
        (
            "<p>Text with 'quotes'</p>",
            ["Unprocessed quotes [\"'\", \"'\"]: Text with 'quotes'"],
        ),
        # Quotes in skipped elements should be ignored
        ('<code>Text with "quotes"</code>', []),
        ('<pre>Text with "quotes"</pre>', []),
        ('<div class="no-formatting">Text with "quotes"</div>', []),
        ('<div class="elvish">Text with "quotes"</div>', []),
        # Nested skipped elements
        ('<div><code>Text with "quotes"</code></div>', []),
        ('<div class="no-formatting"><p>Text with "quotes"</p></div>', []),
        # Mixed content
        (
            """
            <div>
                <p>Normal "quote"</p>
                <code>Ignored "quote"</code>
                <p>Another 'quote'</p>
            </div>
        """,
            [
                "Unprocessed quotes [\"'\", \"'\"]: Another 'quote'",
                "Unprocessed quotes ['\"', '\"']: Normal \"quote\"",
            ],
        ),
    ],
)
def test_check_unprocessed_quotes(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = check_unprocessed_quotes(soup)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "html,expected",
    [
        # Basic dash cases that should be caught
        (
            "<p>Text with -- dash</p>",
            ["Unprocessed dashes: Text with -- dash"],
        ),
        (
            "<p>Text with --- dash</p>",
            ["Unprocessed dashes: Text with --- dash"],
        ),
        (
            "<p>since--as you know</p>",
            ["Unprocessed dashes: since--as you know"],
        ),
        # Horizontal rules
        ("<p>\n---\n</p>", ["Unprocessed dashes: \n---\n"]),
        # Dashes in skipped elements should be ignored
        ("<code>Text with -- dash</code>", []),
        ("<pre>Text with -- dash</pre>", []),
        ('<div class="no-formatting">Text with -- dash</div>', []),
        ('<div class="elvish">Text with -- dash</div>', []),
        # Special cases that should be ignored (from formatting_improvement_html.ts tests)
        ("<p>- First level\n - Second level</p>", []),  # List items
        ("<p>> - First level</p>", []),  # Quoted lists
        ("<p>a browser- or OS-specific fashion</p>", []),  # Compound words
        # Mixed content
        (
            """
            <div>
                <p>Text with -- dash</p>
                <code>Ignored -- dash</code>
                <p>Another --- dash</p>
            </div>
        """,
            [
                "Unprocessed dashes: Text with -- dash",
                "Unprocessed dashes: Another --- dash",
            ],
        ),
    ],
)
def test_check_unprocessed_dashes(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = check_unprocessed_dashes(soup)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "html,expected",
    [
        # Basic HTML tags that should be caught
        (
            "<p>&lt;div&gt; tag</p>",
            ["Unrendered HTML ['<div>']: <div> tag"],
        ),
        (
            "<p>&lt;/br&gt; tag</p>",
            ["Unrendered HTML ['</br>']: </br> tag"],
        ),
        # Self-closing tags
        (
            "<p>&lt;img/&gt; tag</p>",
            ["Unrendered HTML ['<img/>']: <img/> tag"],
        ),
        # Tags with attributes
        (
            '<p>&lt;div class="test"&gt; tag</p>',
            ["Unrendered HTML ['<div ']: <div class=\"test\"> tag"],
        ),
        # Multiple tags in one element
        (
            "<p>&lt;div&gt; and &lt;/div&gt; tags</p>",
            ["Unrendered HTML ['<div>', '</div>']: <div> and </div> tags"],
        ),
        # Tags in skipped elements should be ignored
        ("<code>&lt;div&gt; tag</code>", []),
        ("<pre>&lt;div&gt; tag</pre>", []),
        ('<div class="no-formatting">&lt;div&gt; tag</div>', []),
        ('<div class="elvish">&lt;div&gt; tag</div>', []),
        # Nested skipped elements
        ("<div><code>&lt;div&gt; tag</code></div>", []),
        ('<div class="no-formatting"><p>&lt;div&gt; tag</p></div>', []),
        # Mixed content
        (
            """
            <div>
                <p>&lt;div&gt; tag</p>
                <code>&lt;div&gt; tag</code>
                <p>&lt;/br&gt; tag</p>
            </div>
            """,
            [
                "Unrendered HTML ['<div>']: <div> tag",
                "Unrendered HTML ['</br>']: </br> tag",
            ],
        ),
        # Cases that should not be caught
        ("<p>Text with < or > symbols</p>", []),
        ("<p>Text with <3 heart</p>", []),
        ("<p>Math like 2 < x > 1</p>", []),
        # Complex case with nested elements
        (
            """<p>&lt;video autoplay loop muted playsinline src="<a href="https://assets.turntrout.com/static/images/posts/safelife2.mp4" class="external alias" target="_blank">https://assets.turntrout.com/static/images/posts/safelife2.<abbr class="small-caps">mp4</abbr><span style="white-space:nowrap;">"<img src="https://assets.turntrout.com/static/images/turntrout-favicons/favicon.ico" class="favicon" alt=""></span></a> style="width: 100%; height: 100%; object-fit: cover; margin: 0" ／type="video/<abbr class="small-caps">mp4</abbr>"&gt;<source src="https://assets.turntrout.com/static/images/posts/safelife2.mp4" type="video/mp4"></p>""",
            [
                "Unrendered HTML ['<video ']: <video autoplay loop muted playsinline src=\""
            ],
        ),
    ],
)
def test_check_unrendered_html(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = check_unrendered_html(soup)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "md_content,html_content,expected",
    [
        # Basic image reference
        ("![Alt text](image.jpg)", "<img src='image.jpg'>", []),
        # Missing image from HTML
        (
            "![Alt text](missing.jpg)",
            "<img src='other.jpg'>",
            [
                "Asset missing.jpg appears 1 times in markdown but only 0 times in HTML"
            ],
        ),
        # Test all supported asset tags
        (
            "\n".join(
                [
                    f"<{tag} src='test.{tag}.file'></{tag}>"
                    for tag in tags_to_check_for_missing_assets
                ]
            ),
            "\n".join(
                [
                    f"<{tag} src='test.{tag}.file'></{tag}>"
                    for tag in tags_to_check_for_missing_assets
                ]
            ),
            [],
        ),
        # Missing assets for each tag type
        (
            "\n".join(
                [
                    f"<{tag} src='missing.{tag}.file'></{tag}>"
                    for tag in tags_to_check_for_missing_assets
                ]
            ),
            "<div>No assets</div>",
            [
                f"Asset missing.{tag}.file appears 1 times in markdown but only 0 times in HTML"
                for tag in tags_to_check_for_missing_assets
            ],
        ),
        # Mixed markdown and HTML tags
        (
            "![](image.jpg)\n<video src='video.mp4'>\n<audio src='audio.mp3'>",
            "<img src='image.jpg'><video src='video.mp4'><audio src='audio.mp3'>",
            [],
        ),
        # Extra HTML assets -> OK
        (
            "<video src='video.mp4'>\n<audio src='audio.mp3'>",
            "<video src='video.mp4'><audio src='audio.mp3'>",
            [],
        ),
        # Test whitespace handling around asset references
        (
            "![ ](  image.jpg  )\n<video src=' video.mp4 '>\n<audio src=' audio.mp3  '>",
            "<img src='image.jpg'><video src='video.mp4'><audio src='audio.mp3'>",
            [],
        ),
        (
            "![ ](  missing.jpg  )",
            "<img src='other.jpg'>",
            [
                "Asset missing.jpg appears 1 times in markdown but only 0 times in HTML"
            ],
        ),
        # Test asset appearing multiple times in markdown but fewer times in HTML
        (
            "![First](repeat.jpg)\n![Second](repeat.jpg)",
            "<img src='repeat.jpg'>",
            [
                "Asset repeat.jpg appears 2 times in markdown but only 1 times in HTML"
            ],
        ),
        # Test different path formats (absolute vs relative)
        (
            """
            ![](/asset_staging/test1.png)
            ![](/asset_staging/test2.png)
            <img src="/asset_staging/test3.png">
            """,
            """
            <img src="./asset_staging/test1.png">
            <img src="../asset_staging/test2.png">
            <img src="/asset_staging/test3.png">
            """,
            [],
        ),
    ],
)
def test_check_markdown_assets_in_html(
    monkeypatch,
    tmp_path: Path,
    md_content: str,
    html_content: str,
    expected: list[str],
):
    """Test that markdown assets are properly checked against HTML output for all supported tags"""
    # Setup test files
    md_path = tmp_path / "content" / "test.md"
    html_path = tmp_path / "public" / "test.html"

    # Create directory structure
    md_path.parent.mkdir(parents=True, exist_ok=True)
    html_path.parent.mkdir(parents=True, exist_ok=True)

    # Write test files
    md_path.write_text(md_content)
    html_path.write_text(f"<html><body>{html_content}</body></html>")

    # Mock get_git_root to return tmp_path using monkeypatch
    monkeypatch.setattr("scripts.utils.get_git_root", lambda: tmp_path)

    # Run test
    soup = BeautifulSoup(html_content, "html.parser")
    result = check_markdown_assets_in_html(soup, md_path)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "html,expected",
    [
        # Basic cases - missing spaces
        (
            "<p>text<em>emphasis</em>text</p>",
            [
                "Missing space before: text<em>emphasis</em>",
                "Missing space after: <em>emphasis</em>text",
            ],
        ),
        # Test allowed characters before emphasis
        *[
            (f"<p>text{char}<em>emphasis</em> text</p>", [])
            for char in ALLOWED_ELT_PRECEDING_CHARS
        ],
        # Test allowed characters after emphasis
        *[
            (f"<p>text <em>emphasis</em>{char}text</p>", [])
            for char in ALLOWED_ELT_FOLLOWING_CHARS
        ],
        # Test mixed cases
        (
            "<p>text(<em>good</em>text<strong>bad</strong>) text</p>",
            [
                "Missing space after: <em>good</em>text",
                "Missing space before: text<strong>bad</strong>",
            ],
        ),
        # Test with i and b tags
        (
            "<p>text<i>italic</i>text<b>bold</b>text</p>",
            [
                "Missing space before: text<i>italic</i>",
                "Missing space after: <i>italic</i>text",
                "Missing space before: text<b>bold</b>",
                "Missing space after: <b>bold</b>text",
            ],
        ),
        # Test with nested emphasis
        (
            "<p>text<em><strong>nested</strong></em>text</p>",
            [
                "Missing space before: text<em>nested</em>",
                "Missing space after: <em>nested</em>text",
            ],
        ),
        # Test with multiple paragraphs
        (
            """
            <p>text<em>one</em>text</p>
            <p>text <em>two</em> text</p>
            <p>text<em>three</em>text</p>
            """,
            [
                "Missing space before: text<em>one</em>",
                "Missing space after: <em>one</em>text",
                "Missing space before: text<em>three</em>",
                "Missing space after: <em>three</em>text",
            ],
        ),
    ],
)
def test_check_emphasis_spacing(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = check_emphasis_spacing(soup)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "html,expected",
    [
        # Test description within limit
        (
            """
            <html>
            <head>
                <meta name="description" content="This is a valid description.">
            </head>
            </html>
            """,
            [],
        ),
        # Test description exceeding limit
        (
            f"""
            <html>
            <head>
                <meta name="description" content="{'a' * (MAX_DESCRIPTION_LENGTH + 1)}">
            </head>
            </html>
            """,
            [
                f"Description too long: {MAX_DESCRIPTION_LENGTH + 1} characters (recommended <= {MAX_DESCRIPTION_LENGTH})"
            ],
        ),
        # Test description below minimum length
        (
            f"""
            <html>
            <head>
                <meta name="description" content="{'a' * (MIN_DESCRIPTION_LENGTH - 1)}">
            </head>
            </html>
            """,
            [
                f"Description too short: {MIN_DESCRIPTION_LENGTH - 1} characters (recommended >= {MIN_DESCRIPTION_LENGTH})"
            ],
        ),
        # Test missing description
        (
            """
            <html>
            <head>
            </head>
            </html>
            """,
            ["Description not found"],
        ),
        # Test empty description
        (
            """
            <html>
            <head>
                <meta name="description" content="">
            </head>
            </html>
            """,
            ["Description not found"],
        ),
    ],
)
def test_check_description_length(html: str, expected: list[str]) -> None:
    """Test the check_description_length function."""
    soup = BeautifulSoup(html, "html.parser")
    result = check_description_length(soup)
    assert result == expected


@pytest.mark.parametrize(
    "css_content,expected",
    [
        # Test CSS with @supports
        (
            """
            @supports (initial-letter: 4) {
                p::first-letter {
                    initial-letter: 4;
                }
            }
            """,
            [],
        ),
        # Test CSS without @supports
        (
            """
            p::first-letter {
                float: left;
                font-size: 4em;
            }
            """,
            [
                "CSS file test.css does not contain @supports, which is "
                "required for dropcaps in Firefox"
            ],
        ),
        # Test empty CSS
        (
            "",
            [
                "CSS file test.css does not contain @supports, which is "
                "required for dropcaps in Firefox"
            ],
        ),
        # Test CSS with multiple @supports
        (
            """
            @supports (display: grid) {
                .grid { display: grid; }
            }
            @supports (initial-letter: 4) {
                p::first-letter { initial-letter: 4; }
            }
            """,
            [],
        ),
    ],
)
def test_check_css_issues(
    tmp_path: Path, css_content: str, expected: list[str]
):
    """Test the check_css_issues function with various CSS contents."""
    # Create a temporary CSS file
    css_file = tmp_path / "test.css"
    css_file.write_text(css_content)

    result = check_css_issues(css_file)
    assert result == expected


def test_check_css_issues_missing_file(tmp_path: Path):
    """Test check_css_issues with a non-existent file."""
    css_file = tmp_path / "nonexistent.css"
    result = check_css_issues(css_file)
    assert result == [f"CSS file {css_file} does not exist"]


@pytest.mark.parametrize(
    "html,expected",
    [
        # Single critical CSS - valid
        (
            '<html><head><style id="critical-css">.css{}</style></head></html>',
            True,
        ),
        # No critical CSS - invalid
        ("<html><head><style>.css{}</style></head></html>", False),
        # No head - invalid
        ("<html><head></head></html>", False),
        # Multiple critical CSS blocks - invalid
        (
            '<html><head><style id="critical-css">.css{}</style><style id="critical-css">.more{}</style></head></html>',
            False,
        ),
        # Critical CSS outside head - invalid
        (
            '<html><head></head><body><style id="critical-css">.css{}</style></body></html>',
            False,
        ),
    ],
)
def test_check_critical_css(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = check_critical_css(soup)
    assert result == expected


@pytest.mark.parametrize(
    "html,expected",
    [
        # Test meta/title tags after MAX_HEAD_SIZE
        (
            f"<head>{('a' * MAX_META_HEAD_SIZE)}<meta name='test'><title>Late tags</title></head>",
            [
                "<meta> tag found after first 9KB: <meta name='test'>",
                "<title> tag found after first 9KB: <title>",
            ],
        ),
        # Test tags before MAX_HEAD_SIZE (should be fine)
        (
            f"<head><meta name='test'><title>Early tags</title></head>{'a' * MAX_META_HEAD_SIZE}",
            [],
        ),
        # Test tags split across MAX_HEAD_SIZE boundary
        (
            f"<head>{'a' * (MAX_META_HEAD_SIZE - 10)}<meta name='test'><title>Split tags</title></head>",
            ["<title> tag found after first 9KB: <title>"],
        ),
        # Test no head tag
        (
            f"{'a' * MAX_META_HEAD_SIZE}<meta name='test'><title>No head</title>",
            [],
        ),
        # Test empty file
        (
            "",
            [],
        ),
        # Test multiple meta tags after MAX_HEAD_SIZE
        (
            f"<head>{'a' * MAX_META_HEAD_SIZE}<meta name='test1'><meta name='test2'></head>",
            [
                "<meta> tag found after first 9KB: <meta name='test1'>",
                "<meta> tag found after first 9KB: <meta name='test2'>",
            ],
        ),
    ],
)
def test_meta_tags_first_10kb(tmp_path, html, expected):
    """Test checking for meta and title tags after first 9KB of file."""
    test_file = tmp_path / "test.html"
    test_file.write_text(html)

    result = meta_tags_early(test_file)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "html,expected_count",
    [
        # Test valid internal link
        ('<a class="internal" href="/some/path">Valid Link</a>', 0),
        # Test internal link without href
        ('<a class="internal">Missing href</a>', 1),
        # Test internal link with https://
        (
            '<a class="internal" href="https://example.com">External Link</a>',
            1,
        ),
        # Test multiple invalid links
        (
            """
            <div>
                <a class="internal">No href</a>
                <a class="internal" href="https://example.com">External</a>
                <a class="internal" href="/valid">Valid</a>
            </div>
            """,
            2,
        ),
        # Test link without internal class (should be ignored)
        (
            '<a href="https://example.com">External without internal class</a>',
            0,
        ),
        # Test mixed valid and invalid
        (
            """
            <div>
                <a class="internal" href="/path1">Valid 1</a>
                <a class="internal">Invalid 1</a>
                <a class="internal" href="/path2">Valid 2</a>
                <a class="internal" href="https://example.com">Invalid 2</a>
            </div>
            """,
            2,
        ),
    ],
)
def test_check_invalid_internal_links(html, expected_count):
    """Test the check_invalid_internal_links function with various test cases."""
    soup = BeautifulSoup(html, "html.parser")
    result = check_invalid_internal_links(soup)
    assert len(result) == expected_count
    # Verify that all returned items are BeautifulSoup Tag objects
    for link in result:
        assert isinstance(link, Tag)
        assert "internal" in link.get("class", [])
        # Verify the link is actually invalid
        assert not link.has_attr("href") or link["href"].startswith("https://")


@pytest.mark.parametrize(
    "html,expected,mock_responses",
    [
        # Test successful response
        (
            '<iframe src="https://example.com" title="Example" alt="Alt text"></iframe>',
            [],
            [(True, 200)],
        ),
        # Test failed response
        (
            '<iframe src="https://fail.com" title="Fail Test" alt="Alt desc"></iframe>',
            [
                "Iframe source https://fail.com returned status 404. Description: title='Fail Test' (alt='Alt desc')"
            ],
            [(False, 404)],
        ),
        # Test request exception
        (
            '<iframe src="https://error.com" title="Error Test"></iframe>',
            [
                "Failed to load iframe source https://error.com: Connection error. Description: title='Error Test' (alt='')"
            ],
            [Exception("Connection error")],
        ),
        # Test multiple iframes
        (
            """
            <iframe src="https://success.com" title="Success"></iframe>
            <iframe src="https://fail.com" title="Fail"></iframe>
            <iframe src="https://error.com" title="Error"></iframe>
            """,
            [
                "Iframe source https://fail.com returned status 404. Description: title='Fail' (alt='')",
                "Failed to load iframe source https://error.com: Connection error. Description: title='Error' (alt='')",
            ],
            [(True, 200), (False, 404), Exception("Connection error")],
        ),
        # Test protocol-relative URL
        (
            '<iframe src="//protocol-relative.com" title="Protocol"></iframe>',
            [
                "Iframe source https://protocol-relative.com returned status 404. Description: title='Protocol' (alt='')"
            ],
            [(False, 404)],
        ),
        # Test relative URL (should be skipped)
        (
            '<iframe src="/relative/path" title="Relative"></iframe>',
            [],
            [],
        ),
        # Test iframe without src
        (
            '<iframe title="No Src"></iframe>',
            [],
            [],
        ),
    ],
)
def test_check_iframe_sources(
    monkeypatch, html: str, expected: list[str], mock_responses: list
):
    """Test the check_iframe_sources function with various scenarios."""
    soup = BeautifulSoup(html, "html.parser")

    # Counter to track which response to return
    response_index = 0

    def mock_head(url: str, timeout: int) -> object:
        nonlocal response_index
        if response_index >= len(mock_responses):
            raise ValueError("Not enough mock responses provided")

        response = mock_responses[response_index]
        response_index += 1

        if isinstance(response, Exception):
            raise requests.RequestException(str(response))

        ok, status_code = response
        mock_response = type(
            "MockResponse", (), {"ok": ok, "status_code": status_code}
        )
        return mock_response

    # Patch the requests.head function
    monkeypatch.setattr(requests, "head", mock_head)

    result = check_iframe_sources(soup)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "html,expected",
    [
        # Basic cases - missing spaces
        (
            "<p>text<a href='#'>link</a></p>",
            ["Missing space before: text<a>link</a>"],
        ),
        # Test allowed characters before link
        *[
            (f"<p>text{char}<a href='#'>link</a> text</p>", [])
            for char in ALLOWED_ELT_PRECEDING_CHARS
        ],
        # Test allowed characters after link
        *[
            (f"<p>text <a href='#'>link</a>{char}text</p>", [])
            for char in ALLOWED_ELT_FOLLOWING_CHARS
        ],
        # Test mixed cases
        (
            "<p>text(<a href='#'>good</a> text<a href='#'>bad</a>)</p>",
            ["Missing space before:  text<a>bad</a>"],
        ),
        # Test footnote links (should be ignored)
        (
            "<p>text<a href='#user-content-fn-1'>footnote</a></p>",
            [],
        ),
        # Test multiple links
        (
            """
            <p>text<a href='#'>one</a> text</p>
            <p>text <a href='#'>two</a> text</p>
            <p>text<a href='#'>three</a> text</p>
            """,
            [
                "Missing space before: text<a>one</a>",
                "Missing space before: text<a>three</a>",
            ],
        ),
        (
            "<p>Hi <a href='#'>Test<span>span</span></a> text</p>",
            [],
        ),
        (  # Multiline matching
            "<p>Hi <a href='#'>Test<span>span</span></a> text\n\nTest</p>",
            [],
        ),
    ],
)
def test_check_link_spacing(html, expected):
    """Test the check_link_spacing function."""
    soup = BeautifulSoup(html, "html.parser")
    result = check_link_spacing(soup)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "html,expected",
    [
        # Basic consecutive periods
        (
            "<p>Test..</p>",
            ["Consecutive periods found: Test.."],
        ),
        # Periods separated by quotes
        (
            '<p>Test.".</p>',
            ['Consecutive periods found: Test.".'],
        ),
        # Periods separated by curly quotes
        (
            "<p>Test.”.</p>",
            ["Consecutive periods found: Test.”."],
        ),
        # Multiple instances in one element
        (
            '<p>First.. Second.".</p>',
            ['Consecutive periods found: First.. Second.".'],
        ),
        # Skipped elements
        (
            "<code>Test..</code>",
            [],
        ),
        ('<div class="no-formatting">Test..</div>', []),
        # Mixed content with skipped elements
        (
            """
            <div>
                <p>Valid..</p>
                <code>Skipped..</code>
                <p>Also.".</p>
            </div>
            """,
            [
                "Consecutive periods found: Valid..",
                'Consecutive periods found: Also.".',
            ],
        ),
        # Edge cases
        (
            "<p>Single period. No issue</p>",
            [],
        ),
        (
            "<p>Multiple... periods</p>",
            ["Consecutive periods found: Multiple... periods"],
        ),
        # Nested elements
        (
            "<p>Test<em>..</em>nested</p>",
            ["Consecutive periods found: .."],
        ),
        # Ignore ..?
        (
            "<p>Test..?</p>",
            [],
        ),
    ],
)
def test_check_consecutive_periods(html, expected):
    """Test the check_consecutive_periods function."""
    soup = BeautifulSoup(html, "html.parser")
    result = check_consecutive_periods(soup)
    assert sorted(result) == sorted(expected)


@pytest.mark.parametrize(
    "html,expected",
    [
        # Test favicon directly under span with correct class (valid)
        (
            '<span class="favicon-span"><img class="favicon" src="test.ico"></span>',
            [],
        ),
        # Test favicon without parent span (invalid)
        (
            '<div><img class="favicon" src="test.ico"></div>',
            [
                "Favicon (test.ico) is not a direct child of a span.favicon-span. Instead, it's a child of <div>: "
            ],
        ),
        # Test favicon nested deeper (invalid)
        (
            '<span class="favicon-span"><div><img class="favicon" src="test.ico"></div></span>',
            [
                "Favicon (test.ico) is not a direct child of a span.favicon-span. Instead, it's a child of <div>: "
            ],
        ),
        # Test multiple favicons
        (
            """
            <div>
                <span class="favicon-span"><img class="favicon" src="valid.ico"></span>
                <div><img class="favicon" src="invalid.ico"></div>
            </div>
            """,
            [
                "Favicon (invalid.ico) is not a direct child of a span.favicon-span. Instead, it's a child of <div>: "
            ],
        ),
        # Test favicon with no parent
        (
            '<img class="favicon" src="orphan.ico">',
            [
                "Favicon (orphan.ico) is not a direct child of a span.favicon-span. Instead, it's a child of <[document]>: "
            ],
        ),
        # Test non-favicon images (should be ignored)
        (
            '<div><img src="regular.png"></div>',
            [],
        ),
        # Test favicon under span but missing required class (invalid)
        (
            '<span><img class="favicon" src="test.ico"></span>',
            [
                "Favicon (test.ico) is not a direct child of a span.favicon-span. Instead, it's a child of <span>: "
            ],
        ),
    ],
)
def test_check_favicon_parent_elements(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    assert check_favicon_parent_elements(soup) == expected


@pytest.mark.parametrize(
    "file_structure,expected",
    [
        # Test robots.txt in root (valid)
        (["robots.txt"], []),
        # Test missing robots.txt
        ([], ["robots.txt not found in site root"]),
        # Test robots.txt in subdirectory (should still report missing from root)
        (["static/robots.txt"], ["robots.txt not found in site root"]),
    ],
)
def test_check_robots_txt_location(
    tmp_path: Path, file_structure: List[str], expected: List[str]
):
    """Test the check_robots_txt_location function with various file structures."""
    # Create the test files
    for file_path in file_structure:
        full_path = tmp_path / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.touch()

    result = check_robots_txt_location(tmp_path)
    assert result == expected

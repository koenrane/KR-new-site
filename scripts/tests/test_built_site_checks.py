import subprocess
import sys
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from ..utils import get_git_root

sys.path.append(str(Path(__file__).parent.parent))

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..built_site_checks import *
else:
    from built_site_checks import *


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
        <span class="katex"><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:1em;vertical-align:-0.25em;"></span><span class="mord text" style="color:#cc0000;"><span class="mord" style="color:#cc0000;">\\rewavcxx</span></span></span></span></span>
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
    assert "Table: This is a table description" in result
    assert "Figure: This is a figure caption" in result
    assert "Code: This is a code snippet" in result
    assert "Normal paragraph" not in result
    assert "This is a delayed-paragraph Table: " not in result


def test_check_katex_elements_for_errors(sample_html_with_katex_errors):
    html = BeautifulSoup(sample_html_with_katex_errors, "html.parser")
    result = check_katex_elements_for_errors(html)
    assert result == ["\\rewavcxx"]


def test_parse_html_file(tmp_path):
    file_path = tmp_path / "test.html"
    file_path.write_text("<html><body><p>Test</p></body></html>")
    result = parse_html_file(file_path)
    assert isinstance(result, BeautifulSoup)
    assert result.find("p").text == "Test"


def test_check_local_media_files(sample_soup, temp_site_root):
    # Create an existing image file
    (temp_site_root / "existing-image.jpg").touch()
    (temp_site_root / "existing-video.mp4").touch()

    result = check_local_media_files(sample_soup, temp_site_root)
    assert set(result) == {"missing-image.png", "missing-svg.svg"}


def test_check_file_for_issues(tmp_path):
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
        <p>Subtitle: Unrendered subtitle</p>
        <p class="subtitle">Rendered subtitle</p>
    </body>
    </html>
    """
    )
    issues = check_file_for_issues(file_path, tmp_path)
    assert issues["localhost_links"] == ["https://localhost:8000"]
    assert issues["invalid_anchors"] == ["#invalid-anchor"]
    assert issues["problematic_paragraphs"] == ["Table: Test table"]
    assert issues["missing_media_files"] == ["missing-image.jpg"]
    assert issues["trailing_blockquotes"] == [
        "This is a problematic blockquote >"
    ]
    assert issues["unrendered_subtitles"] == ["Subtitle: Unrendered subtitle"]


complicated_blockquote = """
<blockquote class="callout quote" data-callout="quote">
<div class="callout-title"><div class="callout-icon"></div><div class="callout-title-inner"> <a href="https://www.lesswrong.com/posts/2JJtxitp6nqu6ffak/basic-facts-about-language-models-during-training-1#Residual_stream_outliers_grow_rapidly_then_stabilize_and_decline" class="external alias" target="_blank">Basic facts about language models during trai<span style="white-space:nowrap;">ning<img src="https://assets.turntrout.com/static/images/external-favicons/lesswrong_com.avif" class="favicon" alt=""></span></a> &gt; <img src="https://assets.turntrout.com/static/images/posts/m1uteifqbbyox6qp9xnx.avif" alt="" loading="lazy"></div></div>
</blockquote>
"""


def test_complicated_blockquote(tmp_path):
    file_path = tmp_path / "test.html"
    file_path.write_text(complicated_blockquote)
    issues = check_file_for_issues(file_path, tmp_path)
    assert issues["trailing_blockquotes"] == [
        "Basic facts about language models during trai ning..."
    ]


@pytest.mark.parametrize(
    "html,expected",
    [
        ('<img src="local.jpg">', ["local.jpg"]),
        ('<img src="https://example.com/image.png">', []),
        ('<video src="video.mp4"></video>', ["video.mp4"]),
        ('<svg src="icon.svg"></svg>', ["icon.svg"]),
        ('<img src="existing.png">', []),
    ],
)
def test_check_local_media_files_parametrized(html, expected, temp_site_root):
    soup = BeautifulSoup(html, "html.parser")
    (temp_site_root / "existing.png").touch()
    result = check_local_media_files(soup, temp_site_root)
    assert result == expected


def test_check_asset_references_all_missing(
    sample_soup_with_assets, temp_site_root
):
    file_path = temp_site_root / "test.html"

    result = check_asset_references(
        sample_soup_with_assets, file_path, temp_site_root
    )

    expected = {
        "/styles/main.css (resolved to styles/main.css)",
        "./index.css (resolved to index.css)",
        "/js/script.js (resolved to js/script.js)",
    }
    assert set(result) == expected


def test_check_asset_references_absolute_paths(temp_site_root):
    html = """
    <html>
    <head>
        <link rel="stylesheet" href="/absolute/path/style.css">
        <script src="/another/absolute/path/script.js"></script>
    </head>
    </html>
    """
    soup = BeautifulSoup(html, "html.parser")
    file_path = temp_site_root / "test.html"

    result = check_asset_references(soup, file_path, temp_site_root)

    expected = {
        "/absolute/path/style.css (resolved to absolute/path/style.css)",
        "/another/absolute/path/script.js (resolved to another/absolute/path/script.js)",
    }
    assert set(result) == expected


def test_check_asset_references_ignore_external(temp_site_root):
    html = """
    <html>
    <head>
        <link rel="stylesheet" href="https://example.com/style.css">
        <script src="http://example.com/script.js"></script>
    </head>
    </html>
    """
    soup = BeautifulSoup(html, "html.parser")
    file_path = temp_site_root / "test.html"

    result = check_asset_references(soup, file_path, temp_site_root)

    assert result == []


@pytest.mark.parametrize(
    "html,expected",
    [
        (
            '<html><head><img class="favicon" href="favicon.ico"></head></html>',
            False,
        ),
        (
            '<html><head><link rel="stylesheet" href="style.css"></head></html>',
            True,
        ),
        ("<html><head></head></html>", True),
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
        "Subtitle: This should be a subtitle",
        "Subtitle: Another unrendered subtitle",
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
        (
            '<html><head><style id="critical-css">.css{}</style></head></html>',
            True,
        ),
        ("<html><head><style>.css{}</style></head></html>", False),
        ("<html><head></head></html>", False),
    ],
)
def test_check_critical_css(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = check_critical_css(soup)
    assert result == expected


@pytest.mark.parametrize(
    "html,expected",
    [
        ("<html><body></body></html>", True),
        ("<html><body><div>Content</div></body></html>", False),
        ("<html></html>", True),
    ],
)
def test_body_is_empty(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = body_is_empty(soup)
    assert result == expected


@pytest.mark.parametrize(
    "html,expected",
    [
        (
            '<html><head><meta http-equiv="refresh" content="0;url=/new-page"></head></html>',
            True,
        ),
        ("<html><head></head></html>", False),
        (
            '<html><head><meta name="description" content="Not a redirect"></head></html>',
            False,
        ),
    ],
)
def test_is_redirect(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = is_redirect(soup)
    assert result == expected


def test_check_file_for_issues_skips_redirects(tmp_path):
    file_path = tmp_path / "test.html"
    file_path.write_text(
        """
    <html>
    <head><meta http-equiv="refresh" content="0;url=/new-page"></head>
    <body>
        <a href="localhost:8000">Localhost Link</a>
        <p>Table: Test table</p>
    </body>
    </html>
    """
    )

    issues = check_file_for_issues(file_path, tmp_path)
    assert issues == {}  # Should return empty dict for redirects


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
            ["Table: Test table"],
        ),
        # Test definition term cases
        (
            """
            <dt>Normal term</dt>
            <dt>: Invalid term</dt>
            """,
            [": Invalid term"],
        ),
        # Test mixed cases
        (
            """
            <p>Table: Test table</p>
            <dt>: Invalid term</dt>
            <p>Normal paragraph</p>
            <dt>Normal term</dt>
            """,
            ["Table: Test table", ": Invalid term"],
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
    assert result == ["! This is an unrendered spoiler."]


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
            ["! Spoiler text here."],
        ),
        # Test multiple unrendered spoilers
        (
            """
            <blockquote>
                <p>! First spoiler.</p>
                <p>! Second spoiler.</p>
            </blockquote>
            """,
            ["! First spoiler.", "! Second spoiler."],
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
            ["# Unrendered heading", "## Another unrendered heading"],
        ),
        # Test mixed problematic cases
        (
            """
            <p># Heading</p>
            <p>Table: Description</p>
            <p>Normal text</p>
            """,
            ["# Heading", "Table: Description"],
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
        # Test basic unrendered emphasis
        ("<p>Text ending with *</p>", ["Text ending with *"]),
        ("<p>Text ending with _</p>", ["Text ending with _"]),
        # Test with trailing whitespace
        ("<p>Text ending with * </p>", ["Text ending with *"]),
        # Test multiple cases
        (
            """
            <p>First line *</p>
            <p>Second line _</p>
            """,
            ["First line *", "Second line _"],
        ),
        # Test cases that should not match
        ("<p>Normal * text</p>", []),
        ("<p>Text with * in middle</p>", []),
        ("<script>code with *</script>", []),  # Should skip script tags
        ("<style>css with *</style>", []),  # Should skip style tags
    ],
)
def test_check_unrendered_emphasis(html, expected):
    soup = BeautifulSoup(html, "html.parser")
    result = check_unrendered_emphasis(soup)
    assert sorted(result) == sorted(expected)

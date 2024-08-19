import pytest

# Import the functions you want to test
from .. import md_processing_single as md_process

# Sample data for testing
sample_post = {
    "slug": "sample-post",
    "title": "Sample Post",
    "contents": {
        "markdown": "Sample markdown content",
        "editedAt": "2023-01-01T00:00:00Z",
    },
    "draft": False,
    "af": False,
    "debate": False,
    "pageUrl": "https://www.lesswrong.com/posts/abcdef123456",
    "lw-page-url": "https://www.lesswrong.com/posts/abcdef123456",
    "linkUrl": "https://www.lesswrong.com/out?url=https%3A%2F%2Fexample.com",
    "question": False,
    "lw-posted-at": "2023-01-01T00:00:00Z",
    "postedAt": "2023-01-01T00:00:00Z",
    "modifiedAt": "2023-01-02T00:00:00Z",
    "curatedDate": None,
    "frontpageDate": None,
    "unlisted": False,
    "shortform": False,
    "commentCount": 10,
    "baseScore": 50,
    "voteCount": 60,
    "prevPost": None,
    "nextPost": None,
    "afBaseScore": None,
    "afCommentCount": None,
    "tags": [{"name": "AI"}],
}

md_process.helpers.permalink_conversion = {"sample-post": "/posts/sample-post"}
md_process.helpers.hash_to_slugs = {"abcdef123456": "sample-post"}


def test_strip_referral_url():
    url = "https://www.lesswrong.com/out?url=https%3A%2F%2Fexample.com"
    assert md_process.strip_referral_url(url) == "https://example.com"
    assert md_process.strip_referral_url("https://example.com") == ""


def test_get_metadata():
    metadata = md_process.get_lw_metadata(sample_post)
    assert metadata["title"] == '"Sample Post"'
    assert metadata["permalink"] == "/posts/sample-post"
    assert metadata["publish"] == "true"
    assert "AI" in metadata["tags"]


def test_timestamp_formatting():
    timestamp = "2023-01-01T00:00:00Z"
    formatted_metadata = md_process.add_quartz_metadata(
        {
            "lw-posted-at": timestamp,
            "lw-page-url": "https://www.lesswrong.com/posts/abcdef123456",
        }
    )
    assert formatted_metadata["date_published"] == "01/01/2023"


def test_metadata_to_yaml():
    metadata = {"key1": "value1", "key2": ["item1", "item2"], "key3": True}
    yaml = md_process.metadata_to_yaml(metadata)
    assert "key1: value1" in yaml
    assert 'key2: \n  - "item1"\n  - "item2"' in yaml
    assert 'key3: "true"' in yaml


def test_fix_footnotes():
    text = "This is a test[\\[1\\]](/posts/abc#fn1). And another[\\[2\\]](/posts/abc#fn2).\n1. **[^](/posts/abc#fnref1)** Footnote 1\n2. **[^](/posts/abc#fnref2)** Footnote 2"
    fixed = md_process.fix_footnotes(text)
    assert "[^1]" in fixed
    assert "[^2]" in fixed
    assert "[^1]: Footnote 1" in fixed
    assert "[^2]: Footnote 2" in fixed


def test_parse_latex():
    md = r"$\begin{align}x &= y\\z &= w\end{align}$"
    parsed = md_process.parse_latex(md)
    print(parsed)
    assert parsed.startswith("$$\n\\begin{align}")
    assert parsed.endswith("\\end{align}\n$$")


def test_remove_prefix_before_slug():
    url = "https://www.lesswrong.com/posts/abcdef123456/sample-post)"
    assert md_process.remove_prefix_before_slug(url) == "/sample-post)"


def test_replace_urls_in_markdown():
    md = "Check out [this post](https://www.lesswrong.com/posts/abcdef123456/sample-post)"
    replaced = md_process.replace_urls(md)
    assert replaced == "Check out [this post](/sample-post)"


def test_manual_replace():
    text = "This test passes iff it works."
    replaced = md_process.manual_replace(text)
    assert "IFF" in replaced


boring_admonition_initial = (
    "> [!quote]\n"
    "> This is a quote\n"
    ">\n"  # Extra newline for clarity
    "> -- [Author](https://example.com)"
)

boring_admonition_target = "> [!quote] [Author](https://example.com)\n> This is a quote"

breakfast_initial = """> [!quote]
>
> Wait, what?
>
> ~ AllAmericanBreakfast, [_The Multi-Tower Study
Strategy_](https://www.lesswrong.com/posts/HZuAT2sGbDbasdjy5/the-multi-tower-study-strategy)"""

breakfast_target: str = """> [!quote] AllAmericanBreakfast, [The Multi-Tower Study
Strategy](https://www.lesswrong.com/posts/HZuAT2sGbDbasdjy5/the-multi-tower-study-strategy)
>
> Wait, what?"""

plain_text_citation_initial = """> [!quote]
> This is a quote with a plain text citation.
> -- John Doe"""

plain_text_citation_target = """> [!quote] John Doe
> This is a quote with a plain text citation."""

multi_line_citation_initial = """> [!quote]
> This is a multi-line quote.
> It has two lines.
> -- Jane Doe, [_Some Book_](https://example.com/book)"""

multi_line_citation_target = """> [!quote] Jane Doe, [Some Book](https://example.com/book)
> This is a multi-line quote.
> It has two lines."""

citation_with_extra_text_initial = """> [!quote]
> Another quote here.
> -- Alice, Bob, and Charlie (2023) in _Some Journal_"""

citation_with_extra_text_target = """> [!quote] Alice, Bob, and Charlie (2023) in _Some Journal_
> Another quote here."""

linked_citation_on_last_line_initial = """> [!quote]
> This is a quote with a linked citation on the last line.
> [Author Name](https://example.com)"""

linked_citation_on_last_line_target = """> [!quote] [Author Name](https://example.com)
> This is a quote with a linked citation on the last line."""


@pytest.mark.parametrize(
    "md,expected",
    [
        (boring_admonition_initial, boring_admonition_target),
        (breakfast_initial, breakfast_target),
        (plain_text_citation_initial, plain_text_citation_target),
        (multi_line_citation_initial, multi_line_citation_target),
        (citation_with_extra_text_initial, citation_with_extra_text_target),
        (linked_citation_on_last_line_initial, linked_citation_on_last_line_target),
    ],
)
def test_move_citation_to_quote_admonition(md: str, expected: str) -> None:
    moved = md_process.move_citation_to_quote_admonition(md)

    assert moved == expected


def test_remove_warning():
    text = "Some text\nmoved away from optimal policies and treated reward functions more realistically.**\nActual content"
    removed = md_process.remove_warning(text)
    assert removed == "Actual content"


def test_display_math():
    post = {"contents": {"markdown": "$x = y$"}}
    processed = md_process.process_markdown(post["contents"]["markdown"], {})
    assert "$$\nx = y\n$$" in processed


def test_remove_number_from_tex():
    text = "$1$ $+1$ $-1$"
    removed = md_process.parse_latex(text)
    assert removed == "1 +1 -1"


if __name__ == "__main__":
    pytest.main()

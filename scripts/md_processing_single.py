import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
import html
from urllib.parse import unquote
import regex

try:
    from . import utils as script_utils
    from . import md_import_helpers as helpers
except ImportError:
    import utils as script_utils
    import md_import_helpers as helpers

# Data processing functions
def read_maybe_generate_json() -> dict:
    """Read or generate JSON data for all posts."""
    if not os.path.exists("/tmp/all_posts_md.json"):
        subprocess.run(["node", "process_json.cjs"], check=True)
    with open("/tmp/all_posts_md.json", "r") as f:
        return json.load(f)

def strip_referral_url(url: str) -> str:
    """Remove referral prefix from LessWrong URLs."""
    prefix = "https://www.lesswrong.com/out?url="
    if not url.startswith(prefix):
        return ""
    target_url = url.partition(prefix)[2]
    return unquote(target_url)

# Metadata processing
pairs = (
    ("permalink", "slug"),
    ("lw-was-draft-post", "draft"),
    ("lw-is-af", "af"),
    ("lw-is-debate", "debate"),
    ("lw-page-url", "pageUrl"),
    ("lw-linkpost-url", "linkUrl"),
    ("lw-is-question", "question"),
    ("lw-posted-at", "postedAt"),
    ("lw-last-modification", "modifiedAt"),
    ("lw-curation-date", "curatedDate"),
    ("lw-frontpage-date", "frontpageDate"),
    ("lw-was-unlisted", "unlisted"),
    ("lw-is-shortform", "shortform"),
    ("lw-num-comments-on-upload", "commentCount"),
    ("lw-base-score", "baseScore"),
    ("lw-vote-count", "voteCount"),
    ("af-base-score", "afBaseScore"),
    ("af-num-comments-on-upload", "afCommentCount"),
)




def get_lw_metadata(post_info: dict[str, Any]) -> dict:
    metadata = dict((key, post_info[val]) for (key, val) in pairs)
    metadata["permalink"] = helpers.permalink_conversion[post_info["slug"]]

    metadata["publish"] = "true" if not metadata["lw-was-draft-post"] else "false"

    title = post_info["title"].replace('"', "'")
    metadata["title"] = f'"{title}"'  # Escape in case of colons
    if "contents" in post_info and (post_info["contents"]):
        metadata["lw-latest-edit"] = post_info["contents"]["editedAt"]
        metadata["lw-is-linkpost"] = not (
            metadata["lw-page-url"] == metadata["lw-linkpost-url"]
        )
        if metadata["lw-is-linkpost"]:
            metadata["lw-linkpost-url"] = strip_referral_url(
                metadata["lw-linkpost-url"]
            )

    if "coauthors" in post_info and post_info["coauthors"]:
        authors = ["Alex Turner"]
        for coauthor in post_info["coauthors"]:
            display_name = coauthor["displayName"]
            if display_name in helpers.username_dict:
                display_name = helpers.username_dict[display_name]
            authors.append(display_name)
        if len(authors) > 2:
            author_str = ", ".join(authors[:-1]) + f", and {authors[-1]}"
        elif len(authors) == 2:
            author_str = f"{authors[0]} and {authors[1]}"
        else:
            author_str = authors[0]
        metadata["authors"] = author_str

    metadata["tags"] = [entry["name"] for entry in post_info["tags"]]
    metadata["tags"] = set(filter(lambda x: x in helpers.keep_tags, metadata["tags"]))
    metadata["tags"] = list(
        map(
            lambda tag: (
                helpers.tag_rename_dict[tag] if tag in helpers.tag_rename_dict else tag
            ),
            metadata["tags"],
        )
    )
    metadata["tags"] = [tag.replace(" ", "-") for tag in metadata["tags"]]

    if not metadata["tags"]:
        print(f"ALERT: {metadata['title']} has no tags\n")

    metadata["aliases"] = [post_info["slug"]]
    if "podcastEpisode" in post_info and (episode := post_info["podcastEpisode"]):
        metadata["lw-podcast-link"] = episode["episodeLink"]
    if "sequence" in post_info and (sequence := post_info["sequence"]):
        metadata["lw-sequence-title"] = sequence["title"]
        metadata["lw-sequence-image-grid"] = sequence["gridImageId"]
        metadata["lw-sequence-image-banner"] = sequence["bannerImageId"]

    for order in ("prev", "next"):
        if post_info[f"{order}Post"]:
            metadata[f"{order}-post-slug"] = post_info[f"{order}Post"]["slug"]

    if "reviewWinner" in post_info and (review_info := post_info["reviewWinner"]):
        metadata["lw-review-art"] = review_info["reviewWinnerArt"]
        metadata["lw-review-competitor-count"] = review_info["competitorCount"]
        metadata["lw-review-year"] = review_info["reviewYear"]
        metadata["lw-review-ranking"] = review_info["reviewRanking"]
        metadata["lw-review-category"] = review_info["category"]

    if helpers.MARKDOWN_WARNING in post_info["contents"]["markdown"]:
        metadata["lw-power-seeking-warning"] = True

    return metadata


def add_quartz_metadata(meta: dict[str, Any]) -> dict[str, Any]:
    """Add Quartz-specific metadata to the existing metadata."""
    publication_timestamp: str = meta["lw-posted-at"]
    # Parse the timestamp (Z indicates UTC timezone)
    dt = datetime.fromisoformat(publication_timestamp[:-1])  # Remove the trailing 'Z'

    # Format into desired string
    formatted_date = dt.strftime("%m/%d/%Y")
    meta["date_published"] = formatted_date

    meta["original_url"] = meta["lw-page-url"]
    return meta


def _entry_to_yaml(key: str, val: Any) -> str:
    yaml = f"{key}: "
    if isinstance(val, list):
        yaml += "\n"
        for item in val:
            yaml += f'  - "{item}"\n'
        return yaml
    elif isinstance(val, bool):
        val = f'"{str(val).lower()}"'
    yaml += f"{val}\n"
    return yaml


def metadata_to_yaml(meta: dict[str, Any]) -> str:
    """Convert metadata dictionary to YAML format."""
    yaml = "---\n"
    for key, val in meta.items():
        yaml += _entry_to_yaml(key, val)
    yaml += "---\n"
    return yaml


def _produceNewFootnote(match, is_footnote_text: bool) -> str:
    # Take first 3 characters because sometimes i used different names for same footnote ref
    cleaned_match = regex.sub(r"[^a-zA-Z0-9 ]", "", match.group(1)).lower().strip()[:3]
    return (
        ("\n" if is_footnote_text else "")  # Start with newline if footnote text
        + rf"[^{cleaned_match}]"
        + (":" if is_footnote_text else "")
    )


def fix_footnotes(text: str) -> str:
    # Footnote invocation replacement (from LW format)
    text = regex.sub(r"\[\\\[([^\]]*)\\\]\]\(.*?\)", r"[^\1]", text)
    # Footnote content replacement (from LW format)
    text = regex.sub(r"(\d+)\.\s*\*{2}\[\^\]\(.*?\)\*{2}\s*", r"[^\1]: ", text)

    # Footnote (manual latex) --- convert end fnref first
    text = regex.sub(
        r"^\s*\$(\^(?:\d+))\$",
        "\n" + r"[\1]:",
        text,
        flags=regex.MULTILINE,
    )

    # Footnote (manual latex, in text)
    text = regex.sub(r"\$(\^\d+)\$", r"[\1]", text)

    # Footnotes with semantic tags --- end fnref
    fn_text = "(?:FOOTNOTE|FN):?"
    text = regex.sub(
        rf"^\s*\**{fn_text} *([\w., ]+)\**",
        # "\n" + r"[^\1]:",
        lambda x: _produceNewFootnote(x, is_footnote_text=True),
        text,
        flags=regex.MULTILINE | regex.IGNORECASE,
    )
    # $^{\text{FN: retarget}}$
    text = regex.sub(
        r"\$\^{?\\text{" + fn_text + " ([\w., ]+)}}?\$",
        lambda x: _produceNewFootnote(x, is_footnote_text=False),
        text,
        flags=regex.MULTILINE | regex.IGNORECASE,
    )

    # Ensure separation after hyperlinks
    return regex.sub(r"\)(\w)", r") \1", text)


def parse_latex(markdown: str) -> str:
    # Turn into block mode if it should be display math
    markdown = regex.sub(
        r"(?:[^\$]|^)\$\\begin\{(align|equation)\}",
        r"$$\\begin{\1}",
        markdown,
        flags=regex.MULTILINE,
    )
    markdown = regex.sub(
        r"\\end\{(align|equation)\} *\$(?!\$)",
        r"\\end{\1}$$",
        markdown,
        flags=regex.MULTILINE,
    )

    # Have proper newlines for equations in display mode
    display_math_pattern = r"(?<=\$\$)(.*?)(?=\$\$)"  # Capture content within $$ ... $$
    inner_slash_pattern = (
        r"(?<!\\)\\(?=\s)"  # Match single \ not preceded or followed by another \
    )

    def _replace_inner(match):
        return match.group(0).replace("\\", "\\\\")

    markdown = regex.sub(
        inner_slash_pattern, _replace_inner, markdown, flags=regex.DOTALL
    )

    # Add newline after the beginning of display math
    markdown = regex.sub(r"(?<=\$\$)(?=[^\n])", r"\n", markdown, flags=regex.MULTILINE)
    # Add newline before the end of display math
    markdown = regex.sub(r"(?<=[^\n])(?=\$\$)", r"\n", markdown, flags=regex.MULTILINE)

    # Don't have single numbers
    markdown = regex.sub(r"\$([+-]?\d+(\.\d+)?)\$", r"\1", markdown)

    # Take as input display mode math text, between $$ and $$
    def replace_cases_and_add_text(display_match) -> str:
        display_text = display_match.group(0)  # All text between $$ and $$

        cases_pattern = r"\$\$\n(?<beforeCases>.*?)\\cases\{(?<inCases>.*?)\}\n\$\$"
        cases_match = regex.search(cases_pattern, display_text, flags=regex.DOTALL)

        if not cases_match:  # No cases found
            return display_text

        before_content = cases_match.group("beforeCases")
        cases_content = cases_match.group("inCases")

        # Replace & ... \\ with & \text{...} \\ within cases_content
        def replace_ampersand(inner_cases_match):
            return (
                f"&\\text{{{inner_cases_match.group(1)}}}{inner_cases_match.group(2)}"
            )

        cases_content = regex.sub(r"&(.*?)(\\\\|$)", replace_ampersand, cases_content)

        # Construct the final replacement using the modified cases_content
        replacement = f"$$\n\\begin{{align}}{before_content}\\begin{{cases}}{cases_content}\\end{{cases}}\\end{{align}}\n$$"
        return replacement

    # Original pattern to match the entire cases environment
    display_math_pattern = r"\$\$\n(.*?)\n\$\$"
    markdown = regex.sub(
        display_math_pattern, replace_cases_and_add_text, markdown, flags=regex.DOTALL
    )

    return markdown


md_url_pattern = regex.compile(r"\[([^][]+)\](\(((?:[^()]+|(?2))+\)))")


def _get_urls(markdown: str) -> list[str]:
    urls = []
    for re_match in md_url_pattern.finditer(markdown):
        _, _, url = re_match.groups()
        urls.append(url)

    return urls


# people getting hurt table
# "But now we have to."
# balance table col widths
#  “fdsajl; fs”—(spaces) vector.
# 0.994
# Check that no ' or " exist outside of code blocks --- in all formattinghtml. Add tests.
# Loading order for eg fonts
# full width images


# Turn links to my LW posts into internal links
def remove_prefix_before_slug(url: str) -> str:
    """Remove the LessWrong URL prefix and convert to internal link."""
    for website_hash, slug in helpers.hash_to_slugs.items():
        lw_regex = regex.compile(
            rf"(?:lesswrong|alignmentforum).*?/{website_hash}/.*#?(.*)(?=\))"
        )

        # Capture anchor information after the slug (if present)
        re_match = regex.search(lw_regex, url)
        if re_match:
            full_match = re_match.group(0)
            url = f"/{slug})"
            # Extract the anchor part (e.g., "#section-title")
            if "#" in full_match:
                # Lesswrong slugger is different than mine; convert.
                anchor_replacements = {
                    "_": "-",
                    "'": "",
                    "--": "-",
                }
                anchor = full_match.split("#")[1]
                for before, after in anchor_replacements.items():
                    anchor = anchor.replace(before, after)
                anchor = anchor.replace("--", "-")  # Error for eg appendices
                url = f"/{slug}#{anchor})"

            return url

    return url  # Return the original URL if no slug match


def get_slug(url: str) -> Optional[str]:
    if "/" in url and "#" in url:
        return url.split("/")[1].split("#")[0]
    else:
        return None


def replace_urls(markdown: str, current_slug: str = "") -> str:
    """Replace LessWrong URLs with internal links."""
    urls: list[str] = _get_urls(markdown)
    for url in urls:
        if "commentId=" in url:
            continue  # Skip comments
        sanitized_url: str = remove_prefix_before_slug(url)
        if (
            get_slug(sanitized_url) == current_slug
        ):  # Site represents same-page anchors this way
            sanitized_url = "#" + sanitized_url.split("#")[1]
        markdown = markdown.replace(url, sanitized_url)
    return markdown


# Fixing some broken urls and other apparent casualties of markdown conversion
replacement = {
    r"Hoffmann,Ruettler,Nieder\(2011\) AnimBehav\.pdf": "Hoffmann,Ruettler,Nieder(2011)AnimBehav.pdf",
    "is_in": "is _in",
    "<em>openai.com/o</em>penai-five/": "openai.com/openai-five/",
    r"\(<em>h</em>ttps://": "(https://",
    "茂": "ï",
    # Weird invisible unicode which act as spaces
    "": "",
    "": "",  # This is a form feed character, which is a whitespace character
    "◻️": "∎",  # Official end of proof symbol
    "lesserwrong.com": "lesswrong.com",
    # Latex substitutions
    r"\\DeclareMathOperator\*?{\\argmax}{arg\\,max}": "",
    r"\\DeclareMathOperator\*?{\\argmin}{arg\\,min}": "",
    r"\\DeclareMathOperator\*?{\\min}{min\\,min}": "",
    # Dead links need redirect
    "https://i.stack.imgur.com": "https://i.sstatic.net",
    "✔️": "✓",  # too hard to see emoji in dark mode
    r"\biff\b": "IFF",
    r"_\._": r"\.",  # Delete this annoying failure to italicize
    "\xa0": " ",  # NBSP to normal space
    r"\* \* \*": "<hr/>\n",  # Fix horizontal rules
    r"\<\|endoftext\|\>": "<endoftext>",
    "2019/2020": "2019 & 2020",
    "_ [_Anki_](https://apps.ankiweb.net/) _.": "[Anki](https://apps.ankiweb.net/).",
    r"^Table: ": "\nTable: ",  # Ensure that captions aren't folded into a new table row
    # A bunch of replacements specific to the GPT-2 steering post
    r'("[\w ]*" ?)-( ?"[\w ]*")': r"\1 − \2",  # Minus sign for steering vectors
    '" wedding"': "“ wedding”",  # Smart quotes have trouble with this one
    r' 9/11 because" -': " 9/11 because” −",  # Minus sign for steering vectors
    '" +"': "“ ”",  # For wedding vector minus space
    "Position 0": "Pos. 0",  # For GPT2 post
    'say goose +"': "say goose ”",
    '" +anger': "“ anger",
    r"`\\-": r"` −",  # Space for inline code in GPT2 post
    r"(−|\\-)`": r"− `",  # Space for inline code in GPT2 post
    r"\*\*Prompt given to the model\*\*": "Prompt given to the model",
    "is as of": "as of",
    "### Love - Hate": "### Love − Hate",
    r"\(RL/supervised\) ": "{RL, supervised}-",
    '"(weddings?) "': "“\1 ”",
    '" worst"': "“ worst”",
    r"\| I hate you because \|": "| --- |\n| I hate you because |",
    r"\$\$ ?\n ?\\mathbf\{versus\} ?\n ?\$\$": "",
    r"Table:  Prompt given to the model.*": "",
    '" you’re such a good': "“ you’re such a good",
    'talk about weddings constantly "': "talk about weddings constantly ”",
    'talk about weddings a lot. "': "talk about weddings a lot.”",
    '" weddings"': "“ weddings”",
    r"}\$\(be": "}$ (be",
    "experimens": "experiment",
    r"Pos\\b": "Pos.",
    r"Coeff\\b": "Coeff.",
    r"ReLu": "ReLU",
    r"Appendix__Related_work": "Appendix_1_Related_Work",
    # Other posts
    r"d̴iv̢erge͏nc̸e͟": "<span class='corrupted'>divergence</span>",
    r"i͟nstab̕il̡i̡t̷y": "<span class='corrupted'>instability</span>",
    r"https://openai\.com/content/images/2017/05/image4\.gif": "./static/images/mujoco-right.gif",  # Dead link in satisficer post
    r"\$(\-?)\\frac{(\d)}{(\d)}\$": r"\1\2/\3",  # Display fractions natively
    r"corrigibility\$\$": "corrigibility",  # Mistake in Formalizing Policy-modification corrigibility
    r"\$_\\text{([^}]+)}\$": r"<sub>\1</sub>",  # Use real subscripts
    r"turn''": 'turn"',  # Smart quotes -- issue with "Formalizing Policy Modification Corrigibility" post
    r"(?<!\$)t\=(\d+)(?!\$)": r"\$t=\1\$",  # LaTeX formatting for t= in "Formalizing Policy Modification Corrigibility"
    "<hr/>\n\n\n1\\.": "[^1]:",  # Manual footnote in Fear of dark post
    r"\[↩︎\]\(#fnref-[\w\-]+\)": "",
    r"2\.  If we collectively think more": "[^2]: If we collectively think more",  # Manual footnote in Optimism impact post
    r"\$\\leftrightarrow\$": "⇔",  # LaTeX to unicode
    r" . (?=Put in cards for key concepts and practice using the concepts.)": ". ",  # Issue after link in anki post
    r"\n(?=\*\*A:\*\*)": r"\n\n",  # Not enough newlines before A: in inner/outer
}

multiline_replacements = {
    r"^\#+ Footnotes": "",  # Remove these sections
    r"^> {2,}(?=1\. don\'t)": "> ",  # Remove extra spacing after start of list item in satisficer post
    r"^\$\$"
    + "\n{2,}": "$$\n",  # For some reason there are random display math opens, TODO understand
    r"^ +\$\$": "$$",  # Remove extra spaces before
}


def manual_replace(md: str) -> str:
    """Apply manual replacements to fix common issues in the markdown."""
    for key, val in replacement.items():
        md = regex.sub(key, val, md)
    for key, val in multiline_replacements.items():
        md = regex.sub(key, val, md, flags=regex.MULTILINE)
    return md

def get_quote_patterns():
    """
    Define and return patterns used for quote admonition processing.
    """
    start_adm_pattern = r"> \[!quote\]\s*"
    body_pattern = r"(?P<body>(?:>.*\n)+?)"
    line_break_pattern = r"(?:>\s*)*"
    pre_citation_pattern = r"> *[~\-—–]+[ _\*]*(?P<prelink>[^\[]*)"
    link_text_pattern = r"(?P<linktext>[^_\*\]]+)"
    link_pattern = r"\[[_\*]*" + link_text_pattern + r"[_\*]*\]"
    url_pattern = r"\((?P<url>[^#].*?)\)"
    md_url_pattern = link_pattern + url_pattern
    post_citation_pattern = r"(?P<postCitation>.*)$"

    return {
        "start_adm": start_adm_pattern,
        "body": body_pattern,
        "line_break": line_break_pattern,
        "pre_citation": pre_citation_pattern,
        "md_url": md_url_pattern,
        "post_citation": post_citation_pattern,
    }

def process_linked_citations(md: str, patterns: dict) -> str:
    """
    Process quotes with linked citations.
    """
    pattern = (
        patterns["start_adm"]
        + patterns["body"]
        + patterns["line_break"]
        + patterns["pre_citation"]
        + patterns["md_url"]
        + patterns["post_citation"]
    )
    target = r"> [!quote] \g<prelink>[\g<linktext>](\g<url>)\g<postCitation>\n\g<body>"
    return regex.sub(pattern, target, md)

def process_plain_text_citations(md: str, patterns: dict) -> str:
    """
    Process quotes with plain text citations.
    """
    pattern = (
        patterns["start_adm"]
        + patterns["body"]
        + patterns["line_break"]
        + patterns["pre_citation"]
        + patterns["post_citation"]
    )
    target = r"> [!quote] \g<prelink>\g<postCitation>\n\g<body>"
    return regex.sub(pattern, target, md, flags=regex.MULTILINE)

def move_citation_to_quote_admonition(md: str) -> str:
    """
    Move citation information in quote admonitions to the beginning of the quote.

    This function processes Markdown text to reformat quote admonitions by moving
    citation information (like author names or source links) from the end of the
    quote to the beginning, right after the "[!quote]" tag.

    The function handles three main cases:
    1. Quotes with linked citations at the end (e.g., "[Author Name](link)")
    2. Quotes with plain text citations at the end
    3. Quotes with linked citations on the last line (transformed to "> -- [Author Name](link)")

    Args:
        md (str): The input Markdown text to process.

    Returns:
        str: The processed Markdown text with reformatted quote admonitions.

    Example:
        Input:
        > [!quote]
        > This is a quote.
        > -- [Author Name](https://example.com)

        Output:
        > [!quote] [Author Name](https://example.com)
        > This is a quote.
    """
    # Check for linked citations on the last line
    patterns = get_quote_patterns()
    last_line_pattern = rf"^> *(?P<lastLine>[\w, ]*{patterns['md_url']}[ _\*]*)$"
    md = regex.sub(last_line_pattern, r"> -- \1", md, flags=regex.MULTILINE)

    md = process_linked_citations(md, patterns)
    md = process_plain_text_citations(md, patterns)
    return md.rstrip("\n")

def remove_warning(markdown: str) -> str:
    """Remove the warning message from power-seeking posts."""
    return markdown.split(helpers.MARKDOWN_WARNING)[-1]

def process_markdown(md: str, metadata: dict) -> str:
    """Main function to process and clean up the markdown content."""
    md = manual_replace(md)

    md = remove_warning(md)  # Warning on power-seeking posts
    md = html.unescape(md)

    md = fix_footnotes(md)

    # unescape the new lines
    newlined = md.replace("\\\\", "\\").replace(r"\\([\[\]\(\)-])", "\\1")
    # fix the lists to not have extra newlines
    single_line_li_md = regex.sub(r"\n\n(\s*)(\d\.|\*) ", r"\n\1\2 ", newlined)
    # make the block quotes contiguous
    contig_md = regex.sub(r"(\>.*?)\n\n(?=\>)", r"\1\n>\n", newlined)

    # surround multiline block quotes with a quote admonition
    longquote_regex = r"((?:^>\s*.*(?:\r?\n|\r)){3,})"
    md = regex.sub(
        longquote_regex, r"> [!quote]\n>\n\1", contig_md, flags=regex.MULTILINE
    )
    md = move_citation_to_quote_admonition(md)

    # Make links to posts relative, now target turntrout.com
    md = replace_urls(md)

    # Standardize "eg" and "ie"
    md = regex.sub(r"\b(?!e\.g\.)e\.?g\.?\b", "e.g.", md, flags=regex.IGNORECASE)
    md = regex.sub(r"\b(?!i\.e\.)i\.?e\.?\b", "i.e.", md, flags=regex.IGNORECASE)
    md = regex.sub(
        r"(e\.g|i\.e)\.,", r"\1.", md
    )  # Remove comma after e.g. or i.e., handling extra spaces

    # Simplify eg 5*5 and \(5\times5\) to 5x5
    number_regex = r"[\-−]?(?:\d{1,3}(?:\,?\d{3})*(?:\.\d+)?|(?:\.\d+))"
    times_sign_regex = r"\s*?(?:\*|\\times)\s*?"
    times_regex_nums = (
        rf"(?:\\\()?({number_regex}|n){times_sign_regex}({number_regex}|n)(?:\\\))?"
    )
    coeff_regex = rf"(coeff){times_sign_regex}(\w+)"
    md = regex.sub(rf"{times_regex_nums}|{coeff_regex}", r"\1×\2", md)

    # Delete extra spaces around bullets
    bulleted_line = r" *\*(?!\*).*\n"
    md = regex.sub(rf"({bulleted_line}) *\n({bulleted_line})(?: *\n)?", r"\1\2", md)
    # Get rid of lines before list start \n\n**A-Outer:**
    md = regex.sub(r"\n *\n( *\*(?: .*)?\n)", r"\n\1", md)

    # single-line $ $ to $$ $$
    md = regex.sub(r"^ *\$([^\$].*[^\$])\$ *$", r"$$\1$$", md, flags=regex.MULTILINE)

    md = parse_latex(md)

    return md

# CLI argument parsing
def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Process Lightweight posts for Quartz import."
    )
    parser.add_argument("title_substring", help="Substring to match in post titles.")
    parser.add_argument(
        "--print", action="store_true", help="Print the generated Markdown."
    )
    return parser.parse_args()

# Main execution
if __name__ == "__main__":
    args = parse_args()
    title_substring = args.title_substring
    git_root = script_utils.get_git_root()

    data = read_maybe_generate_json()
    results = data["data"]["posts"]["results"]

    # Get all hashes
    for post in results:
        if not post["contents"]:
            continue
        current_hash = post["pageUrl"].split("/")[-2]
        helpers.hash_to_slugs[current_hash] = helpers.permalink_conversion[post["slug"]]

    if title_substring == "all":
        posts_to_generate = results
    else:

        matching_posts = [post for post in results if title_substring in post["title"]]

        if len(matching_posts) == 0:
            raise FileNotFoundError(
                f"Error: No posts found with title containing '{title_substring}'"
            )
        elif len(matching_posts) > 1:
            print(
                f"Error: Multiple posts found with title containing '{title_substring}':"
            )
            for post in matching_posts:
                print(f"- {post['title']}")
            sys.exit(1)

        posts_to_generate = [matching_posts[0]]

    for post in posts_to_generate:
        if not post["contents"]:
            continue
        metadata = get_lw_metadata(post)
        metadata = add_quartz_metadata(metadata)
        if metadata["permalink"] in helpers.SKIP_POSTS:
            continue
        yaml = metadata_to_yaml(metadata)
        post_md = process_markdown(post["contents"]["markdown"], metadata)
        md = yaml + post_md


        output_filename = f"{post['slug']}.md"
        output_path = Path(git_root) / "content" / "import" / output_filename
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(md)
        if args.print:
            print(md)

        print(f"Processed post: {post['title']}")

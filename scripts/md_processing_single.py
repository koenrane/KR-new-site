import json
import html
import subprocess
import os
from urllib.parse import unquote
import re
from typing import Any

try:
    from . import md_import_helpers as helpers
except ImportError:
    import md_import_helpers as helpers

# Helper functions (assuming these are defined in md_import_helpers.py)
from md_import_helpers import (
    tag_rename_dict,
    permalink_conversion,
    keep_tags,
    username_dict,
)


def strip_referral_url(url: str) -> str:
    prefix = "https://www.lesswrong.com/out?url="
    if not url.startswith(prefix):
        return ""
    target_url = url.partition(prefix)[2]
    return unquote(target_url)


def get_metadata(post: dict[str, Any]) -> dict:
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

    metadata = dict((key, post[val]) for (key, val) in pairs)
    metadata["permalink"] = permalink_conversion[post["slug"]]
    metadata["publish"] = (
        "true" if not metadata["lw-was-draft-post"] else "false"
    )
    metadata["title"] = post["title"].replace('"', "'")

    if "contents" in post and post["contents"]:
        metadata["lw-latest-edit"] = post["contents"]["editedAt"]
        metadata["lw-is-linkpost"] = not (
            metadata["lw-page-url"] == metadata["lw-linkpost-url"]
        )
        if metadata["lw-is-linkpost"]:
            metadata["lw-linkpost-url"] = strip_referral_url(
                metadata["lw-linkpost-url"]
            )

    # Handle authors
    if "coauthors" in post and post["coauthors"]:
        authors = ["Alex Turner"] + [
            username_dict.get(coauthor["displayName"], coauthor["displayName"])
            for coauthor in post["coauthors"]
        ]
        metadata["authors"] = (
            " and ".join(authors)
            if len(authors) <= 2
            else ", ".join(authors[:-1]) + f", and {authors[-1]}"
        )

    # Handle tags
    metadata["tags"] = [
        tag["name"] for tag in post["tags"] if tag["name"] in keep_tags
    ]
    metadata["tags"] = [
        tag_rename_dict.get(tag, tag).replace(" ", "-")
        for tag in metadata["tags"]
    ]

    if not metadata["tags"]:
        print(f"ALERT: {metadata['title']} has no tags\n")

    metadata["aliases"] = [post["slug"]]

    # Add additional metadata fields
    for field in [
        "podcastEpisode",
        "sequence",
        "prevPost",
        "nextPost",
        "reviewWinner",
    ]:
        if field in post and post[field]:
            metadata.update(process_additional_field(field, post[field]))

    return metadata


def process_additional_field(field: str, data: dict) -> dict:
    field_processors = {
        "podcastEpisode": lambda d: {"lw-podcast-link": d["episodeLink"]},
        "sequence": lambda d: {
            "lw-sequence-title": d["title"],
            "lw-sequence-image-grid": d["gridImageId"],
            "lw-sequence-image-banner": d["bannerImageId"],
        },
        "prevPost": lambda d: {"prev-post-slug": d["slug"]},
        "nextPost": lambda d: {"next-post-slug": d["slug"]},
        "reviewWinner": lambda d: {
            "lw-review-art": d["reviewWinnerArt"],
            "lw-review-competitor-count": d["competitorCount"],
            "lw-review-year": d["reviewYear"],
            "lw-review-ranking": d["reviewRanking"],
            "lw-review-category": d["category"],
        },
    }
    return field_processors[field](data)


def metadata_to_yaml(metadata: dict[str, Any]) -> str:
    yaml = "---\n"
    for key, val in metadata.items():
        if isinstance(val, list):
            yaml += (
                f"{key}:\n" + "\n".join(f'  - "{item}"' for item in val) + "\n"
            )
        elif isinstance(val, bool):
            yaml += f'{key}: "{str(val).lower()}"\n'
        else:
            yaml += f"{key}: {val}\n"
    yaml += "---\n"
    return yaml


def fix_footnotes(text: str) -> str:
    text = re.sub(r"\[\\\[([^\]]*)\\\]\]\(.*?\)", r"[^\1]", text)
    text = re.sub(r"(\d+)\.\s*\*{2}\[\^\]\(.*?\)\*{2}\s*", r"[^\1]: ", text)
    return re.sub(r"\)(\w)", r") \1", text)


def parse_latex(md: str) -> str:
    md = re.sub(
        r"(?:[^\$]|$)\$\\begin\{(align|equation)\}",
        r"$$\\begin{\1}",
        md,
        flags=re.MULTILINE,
    )
    md = re.sub(
        r"\\end\{(align|equation)\} *\$(?!\$)",
        r"\\end{\1}$$",
        md,
        flags=re.MULTILINE,
    )
    md = re.sub(r"(\$\$)([^\n])", r"\1\n\2", md, flags=re.MULTILINE)
    md = re.sub(r"([^\n])(\$\$)", r"\1\n\2", md, flags=re.MULTILINE)
    md = re.sub(r"([^\\])\\(?=$)", r"\1\\\\", md, flags=re.MULTILINE)
    return md


md_url_pattern = re.compile(r"\[([^][]+)\](\(((?:[^()]+|(?2))+\)))")


def _get_urls(md: str) -> list[str]:
    urls = []
    for re_match in md_url_pattern.finditer(md):
        _, _, url = re_match.groups()
        urls.append(url)

    return urls


def replace_urls_in_markdown(md: str) -> str:
    urls: list[str] = _get_urls(md)
    for url in urls:
        if "commentId=" in url:
            continue  # Skip comments
        sanitized_url: str = remove_prefix_before_slug(url)
        md = md.replace(url, sanitized_url)
    return md


def remove_prefix_before_slug(url: str) -> str:
    for hash, slug in helpers.hash_to_slugs.items():
        lw_regex = re.compile(
            f"(?:lesswrong|alignmentforum).*?{hash}(\#(.*?))?"
        )
        re_match = re.search(lw_regex, url)
        if re_match:
            anchor = re_match.group(2) or ""
            return f"/{slug}#{anchor}" if anchor else f"/{slug})"
    return url


def manual_replace(md: str) -> str:
    replacements = {
        "Hoffmann,Ruettler,Nieder(2011) AnimBehav.pdf": "Hoffmann,Ruettler,Nieder(2011)AnimBehav.pdf",
        "is_in": "is _in",
        "<em>openai.com/o</em>penai-five/": "openai.com/openai-five/",
        "\(<em>h</em>ttps://": "(https://",
        "茂": "ï",
        "◻️": "∎",
        "lesserwrong.com": "lesswrong.com",
        r"\\DeclareMathOperator\*?{\\argmax}{arg\\,max}": "",
        r"\\DeclareMathOperator\*?{\\min}{min\\,min}": "",
        "https://i.stack.imgur.com": "https://i.sstatic.net",
        "✔️": "✓",
        r"\biff\b": "IFF",
        r"_\._": r"\.",
        "\xa0": " ",
        r"\* \* \*": "<hr/>",
        r"\<\|endoftext\|\>": "<endoftext>",
    }
    for key, val in replacements.items():
        md = re.sub(key, val, md)
    return md


def move_citation_to_quote_admonition(md: str) -> str:
    patterns = [
        (
            r"> \[!quote\]\s*(?P<body>(?:>.*\n)+)(?:>\s*)*> *[~-—–]+[ _\*]*\[(?P<linktext>[^_\*\]]+)\]\((?P<url>[^#].*?)\)[ _\*]*",
            r"> [!quote] [\g<linktext>](\g<url>)\n\g<body>",
        ),
        (
            r"> \[!quote\]\s*(?P<body>(?:>.*\n)+)(?:>\s*)*> *[~-—–]+[ _\*]*(?P<citationtext>[\w\,\-_\. ]+)[ _\*]*",
            r"> [!quote] \g<citationtext>\n\g<body>",
        ),
    ]
    for pattern, target in patterns:
        md = re.sub(pattern, target, md)
    md = re.sub(r"^> *\n([^>])", r"\1", md, flags=re.MULTILINE)
    return md


def process_markdown(post: dict[str, Any]) -> str:
    md = post["contents"]["markdown"]
    md = manual_replace(md)
    md = md.split(
        "moved away from optimal policies and treated reward functions more realistically.**\n"
    )[-1]
    md = html.unescape(md)
    md = fix_footnotes(md)
    md = md.replace("\\\\", "\\").replace("\\([\[\]\(\)-])", "\\1")
    md = re.sub(r"\n\n(\s*)(\d\.|\*) ", r"\n\1\2 ", md)
    md = re.sub(r"(\>.*?)\n\n(?=\>)", r"\1\n>\n", md)
    md = re.sub(
        r"((?:^>\s*.*(?:\r?\n|\r)){3,})",
        r"> [!quote]\n>\n\1",
        md,
        flags=re.MULTILINE,
    )
    md = move_citation_to_quote_admonition(md)
    md = replace_urls_in_markdown(md)
    md = re.sub(r"\be.?g.?\b", "e.g.", md, flags=re.IGNORECASE)
    md = re.sub(r"\bi.?e.?\b", "i.e.", md, flags=re.IGNORECASE)
    md = re.sub(r"\.\.", ".", md)
    md = re.sub(
        r"(?:\\\()?(\d+|n)\s*(?:\*|\\times)\s*(\d+|n)(?:\\\))?", r"\1×\2", md
    )
    md = re.sub(r"(coeff)\s*(?:\*|\\times)\s*(\w+)", r"\1×\2", md)
    md = re.sub(r"( *\*.*\n) *\n( *\*.*\n)(?: *\n)?", r"\1\2", md)
    md = re.sub(r"\n *\n( *\*(?: .*)?\n)", r"\n\1", md)
    md = re.sub(r"_(.*) _", r"_\1_", md)
    md = re.sub(r"^ *\$([^\$].*[^\$])\$ *$", r"$$\1$$", md, flags=re.MULTILINE)
    md = parse_latex(md)
    return md


def process_post(post_index: int):
    if not os.path.exists("/tmp/all_posts_md.json"):
        print("JSON not found. Running node script to generate JSON.")
        subprocess.run(["node", "./process_json.cjs"])
    with open("/tmp/all_posts_md.json", "r") as f:
        data = json.load(f)
    results = data["data"]["posts"]["results"]

    if post_index >= len(results) or post_index < 0:
        print(f"Invalid post index. Must be between 0 and {len(results) - 1}")
        return

    post = results[post_index]

    if not post["contents"]:
        print("Post has no contents")
        return

    metadata = get_metadata(post)
    yaml = metadata_to_yaml(metadata)
    post_md = process_markdown(post)
    md = yaml + post_md

    output_path = f"/tmp/{metadata['permalink']}.md"
    with open(output_path, "w") as f:
        f.write(md)

    print(f"Processed markdown file written to {output_path}")


if __name__ == "__main__":
    post_index = int(input("Enter the index of the post to process: "))
    process_post(post_index)

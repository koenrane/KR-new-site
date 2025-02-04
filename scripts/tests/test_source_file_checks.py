import sys
from pathlib import Path
from typing import Any, Callable, Dict, List, Tuple

import git
import pytest

sys.path.append(str(Path(__file__).parent.parent))

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..source_file_checks import *
else:
    from source_file_checks import *


@pytest.fixture
def valid_metadata() -> Dict[str, str | List[str]]:
    """
    Fixture providing valid metadata that should pass all checks.
    """
    return {
        "title": "Test Title",
        "description": "Test Description",
        "tags": ["test", "example"],
        "permalink": "/test",
        "date_published": "01/01/2024",
        "date_updated": "01/02/2024",
    }


@pytest.mark.parametrize(
    "metadata,expected_errors",
    [
        # Test case 1: Valid metadata should have no errors
        (
            {
                "title": "Test",
                "description": "Test",
                "tags": ["test"],
                "permalink": "/test",
            },
            [],
        ),
        # Test case 2: Empty/missing required fields should be caught
        (
            {
                "title": "",
                "description": "Test",
                "tags": [],
                "permalink": "/test",
            },
            ["Empty title field", "Empty tags field"],
        ),
        # Test case 3: Missing fields should be caught
        (
            {"description": "Test", "tags": ["test"], "permalink": "/test"},
            ["Missing title field"],
        ),
    ],
)
def test_check_required_fields(
    metadata: Dict[str, str | List[str]], expected_errors: List[str]
) -> None:
    """
    Test the required fields checker with various metadata configurations.

    Args:
        metadata: Test metadata to check
        expected_errors: List of expected error messages
    """
    errors = check_required_fields(metadata)
    assert set(errors) == set(expected_errors)


def test_main_workflow(tmp_path: Path, monkeypatch) -> None:
    """
    Integration test for the main workflow. Tests both valid and invalid
    markdown files in the content directory.

    Args:
        tmp_path: Pytest fixture providing temporary directory
        monkeypatch: Pytest fixture for mocking
    """
    # Set up test directory structure
    content_dir = tmp_path / "content"
    content_dir.mkdir()

    # Initialize git repo
    git.Repo.init(tmp_path)

    # Create test files
    valid_file = content_dir / "valid.md"
    invalid_file = content_dir / "invalid.md"

    # Valid markdown with proper frontmatter
    valid_content = """---
title: Test Title
description: Test Description
tags: [test]
permalink: /test
date_published: 01/01/2024
---
Test content
"""

    # Invalid markdown with missing required fields
    invalid_content = """---
description: Test Description
date_published: 2024-01-01
---
Test content
"""

    valid_file.write_text(valid_content)
    invalid_file.write_text(invalid_content)

    # Mock git root to use our temporary directory
    monkeypatch.setattr(
        script_utils, "get_git_root", lambda *args, **kwargs: tmp_path
    )

    # Main should exit with code 1 due to invalid file
    with pytest.raises(SystemExit) as exc_info:
        main()
    assert exc_info.value.code == 1


@pytest.mark.parametrize(
    "test_case",
    [
        {
            "files": {
                "file1.md": """---
title: First Post
description: Test Description
permalink: /test
---""",
                "file2.md": """---
title: Second Post
description: Test Description
permalink: /test
---""",
            },
            "should_fail": True,
            "reason": "duplicate permalinks",
        },
        {
            "files": {
                "file1.md": """---
title: First Post
description: Test Description
permalink: /test1
aliases: /test2
---""",
                "file2.md": """---
title: Second Post
description: Test Description
permalink: /test2
---""",
            },
            "should_fail": True,
            "reason": "alias matches permalink",
        },
        {
            "files": {
                "file1.md": """---
title: First Post
description: Test Description
permalink: /test1
aliases: [/test2, /test3]
---""",
                "file2.md": """---
title: Second Post
description: Test Description
permalink: /test4
aliases: /test2
---""",
            },
            "should_fail": True,
            "reason": "duplicate aliases",
        },
        {
            "files": {
                "file1.md": """---
title: First Post
description: Test Description
permalink: /test1
aliases: /test2
tags: [test]
---""",
                "file2.md": """---
title: Second Post
description: Test Description
permalink: /test3
aliases: /test4
tags: [test]
---""",
            },
            "should_fail": False,
            "reason": "all URLs unique",
        },
    ],
)
def test_url_uniqueness(tmp_path: Path, monkeypatch, test_case) -> None:
    """
    Test detection of duplicate URLs (permalinks and aliases).
    """
    # Setup
    content_dir = tmp_path / "content"
    content_dir.mkdir()
    git.Repo.init(tmp_path)

    # Create test files
    for filename, content in test_case["files"].items():
        (content_dir / filename).write_text(content)

    # Mock git root to use our temporary directory
    monkeypatch.setattr(
        script_utils, "get_git_root", lambda *args, **kwargs: tmp_path
    )

    if test_case["should_fail"]:
        with pytest.raises(SystemExit, match="1"):
            main()
    else:
        main()  # Should not raise


def test_invalid_md_links(tmp_path: Path, monkeypatch) -> None:
    """
    Test detection of invalid markdown links.
    """
    content_dir = tmp_path / "content"
    content_dir.mkdir()
    git.Repo.init(tmp_path)

    # Create test file with invalid links
    test_file = content_dir / "test.md"
    content = """---
title: Test Post
description: Test Description
permalink: /test
---
# Valid and Invalid Links

Valid link: [Link](/path/to/page)
Invalid link: [Link](path/to/page)
Another invalid: [Link](page.md)
Valid external: [Link](https://example.com)
"""
    test_file.write_text(content)

    # Mock git root
    monkeypatch.setattr(
        script_utils, "get_git_root", lambda *args, **kwargs: tmp_path
    )

    # Should exit with code 1 due to invalid links
    with pytest.raises(SystemExit, match="1"):
        main()


@pytest.fixture
def scss_scenarios() -> Dict[str, Dict[str, Any]]:
    """
    Fixture providing different SCSS test scenarios.
    """
    return {
        "valid": {
            "content": """
                $fonts-dir: '/static/styles/fonts';
                @font-face {
                    font-family: 'ExistingFont';
                    src: url('#{$fonts-dir}/exists.woff2') format('woff2');
                }
            """,
            "files": ["quartz/static/styles/fonts/exists.woff2"],
            "expected_missing": [],
        },
        "missing": {
            "content": """
                $fonts-dir: '/static/styles/fonts';
                @font-face {
                    font-family: 'MissingFont';
                    src: url('#{$fonts-dir}/missing.woff2') format('woff2');
                }
            """,
            "files": [],
            "expected_missing": ["/quartz/static/styles/fonts/missing.woff2"],
        },
        "mixed": {
            "content": """
                $fonts-dir: '/static/styles/fonts';
                @font-face {
                    font-family: 'ExistingFont';
                    src: url('#{$fonts-dir}/exists.woff2') format('woff2');
                }
                @font-face {
                    font-family: 'MissingFont';
                    src: url('#{$fonts-dir}/missing.woff2') format('woff2');
                }
                @font-face {
                    font-family: 'ExternalFont';
                    src: url('https://example.com/font.woff2') format('woff2');
                }
            """,
            "files": ["quartz/static/styles/fonts/exists.woff2"],
            "expected_missing": ["/quartz/static/styles/fonts/missing.woff2"],
        },
        "scss_error": {
            "content": """
                $fonts-dir: '/static/styles/fonts'  // Missing semicolon
                @font-face {
                    font-family: 'TestFont';
                    src: url('#{$fonts-dir}/test.woff2') format('woff2');
                }
            """,
            "files": [],
            "expected_error": "SCSS compilation error",
        },
    }


@pytest.fixture
def setup_font_test(
    tmp_path: Path,
) -> Callable[[str, List[str]], Tuple[Path, Path]]:
    """
    Fixture providing a function to set up font test environment.
    """

    def _setup(scss_content: str, font_files: List[str]) -> Tuple[Path, Path]:
        # Create directory structure
        styles_dir = tmp_path / "quartz" / "styles"
        styles_dir.mkdir(parents=True)

        # Create font files in their full paths
        for font_file in font_files:
            font_path = tmp_path / font_file
            font_path.parent.mkdir(parents=True, exist_ok=True)
            font_path.write_bytes(b"dummy font data")

        # Create and write SCSS file
        fonts_scss = styles_dir / "fonts.scss"
        fonts_scss.write_text(scss_content)

        return fonts_scss, tmp_path

    return _setup


@pytest.mark.parametrize(
    "scenario",
    [
        "valid",
        "missing",
        "mixed",
    ],
)
def test_font_file_scenarios(
    scenario: str,
    scss_scenarios: Dict[str, Dict[str, Any]],
    setup_font_test: Callable,
) -> None:
    """
    Test various font file scenarios.
    """
    test_case = scss_scenarios[scenario]
    fonts_scss, tmp_path = setup_font_test(
        test_case["content"], test_case["files"]
    )

    missing_fonts = check_scss_font_files(fonts_scss, tmp_path)
    assert missing_fonts == test_case["expected_missing"]


def test_scss_compilation_error(
    scss_scenarios: Dict[str, Dict[str, Any]],
    setup_font_test: Callable,
) -> None:
    """
    Test handling of SCSS compilation errors.
    """
    test_case = scss_scenarios["scss_error"]
    fonts_scss, tmp_path = setup_font_test(test_case["content"], [])

    missing_fonts = check_scss_font_files(fonts_scss, tmp_path)
    assert len(missing_fonts) == 1
    assert test_case["expected_error"] in missing_fonts[0]


def test_integration_with_main(
    scss_scenarios: Dict[str, Dict[str, Any]],
    setup_font_test: Callable,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Integration test including font file checks.
    """
    # Set up test environment with missing fonts scenario
    test_case = scss_scenarios["missing"]
    fonts_scss, tmp_path = setup_font_test(test_case["content"], [])

    # Create content directory (needed for main())
    content_dir = tmp_path / "content"
    content_dir.mkdir(exist_ok=True)

    # Initialize git repo
    git.Repo.init(tmp_path)

    # Mock git root
    monkeypatch.setattr(
        script_utils, "get_git_root", lambda *args, **kwargs: tmp_path
    )

    # Main should exit with code 1 due to missing font
    with pytest.raises(SystemExit) as exc_info:
        main()
    assert exc_info.value.code == 1


def test_compile_scss(tmp_path: Path) -> None:
    """
    Test SCSS compilation.
    """
    scss_file = tmp_path / "test.scss"
    scss_file.write_text(
        """
        $color: red;
        body { color: $color; }
    """
    )

    css = compile_scss(scss_file)
    assert "body" in css
    assert "red" in css


def test_check_font_files(tmp_path: Path) -> None:
    """
    Test font file checking.
    """
    css_content = """
        @font-face {
            font-family: 'TestFont';
            src: url('/static/styles/fonts/test.woff2') format('woff2');
        }
    """

    missing = check_font_files(css_content, tmp_path)
    assert "/quartz/static/styles/fonts/test.woff2" in missing


def test_check_font_families() -> None:
    """
    Test font family declaration checking.
    """
    css_content = """
        @font-face {
            font-family: 'DeclaredFont';
            src: url('/fonts/test.woff2');
        }
        body {
            --font-test: "UndeclaredFont", serif;
        }
    """

    missing = check_font_families(css_content)
    assert "Undeclared font family: undeclaredfont" in missing


def test_check_font_families_with_opentype() -> None:
    """
    Test font family checking with OpenType features.
    """
    css_content = """
        @font-face {
            font-family: 'EBGaramond';
            src: url('/fonts/test.woff2');
        }
        body {
            --font-test: "EBGaramond:+swsh", serif;
            --font-other: "EBGaramond:smcp", monospace;
        }
    """

    missing = check_font_families(css_content)
    assert len(missing) == 0  # Should not report EBGaramond as missing


def test_check_latex_tags(tmp_path: Path) -> None:
    """
    Test detection of LaTeX \tag{} commands in markdown files.
    """
    content_dir = tmp_path / "content"
    content_dir.mkdir()
    git.Repo.init(tmp_path)

    # Create test file with LaTeX tags
    test_file = content_dir / "test.md"
    content = """---
title: Test Post
description: Test Description
permalink: /test
---
# Math Content

Valid equation: $x^2 + y^2 = z^2$
Invalid tag: $$x^2 \\tag{1}$$
Another invalid: $\\tag{eq:test}$
"""
    test_file.write_text(content)

    # Test direct function
    errors = check_latex_tags(test_file)
    assert len(errors) == 2
    assert all("LaTeX \\tag{} found at line" in error for error in errors)


@pytest.mark.parametrize(
    "content,expected_count",
    [
        ("No tags here", 0),
        ("One \\tag{1}", 1),
        ("$$x^2 \\tag{1}$$ and \\tag{2}", 2),
        ("Escaped \\\\tag{1}", 0),  # Escaped backslash shouldn't count
        ("```math\n\\tag{1}\n```", 1),  # Should detect in code blocks too
    ],
)
def test_latex_tags_variations(
    tmp_path: Path, content: str, expected_count: int
) -> None:
    """
    Test various scenarios for LaTeX tag detection.

    Args:
        tmp_path: Pytest fixture providing temporary directory
        content: Test content to check
        expected_count: Expected number of tag violations
    """
    test_file = tmp_path / "test.md"
    test_file.write_text(content)

    errors = check_latex_tags(test_file)
    assert len(errors) == expected_count


@pytest.mark.parametrize(
    "test_case",
    [
        # Test case 1: Valid bidirectional relationship
        {
            "posts": {
                "/post1": {"permalink": "/post1", "next-post-slug": "/post2"},
                "/post2": {"permalink": "/post2", "prev-post-slug": "/post1"},
            },
            "check_permalink": "/post1",
            "expected_errors": [],
            "description": "valid bidirectional relationship",
        },
        # Test case 2: Missing reverse relationship
        {
            "posts": {
                "/post1": {"permalink": "/post1", "next-post-slug": "/post2"},
                "/post2": {"permalink": "/post2"},
            },
            "check_permalink": "/post1",
            "expected_errors": [
                "Post /post2 should have prev-post-slug=/post1; currently has "
            ],
            "description": "missing reverse relationship",
        },
        # Test case 3: Invalid reverse relationship
        {
            "posts": {
                "/post1": {"permalink": "/post1", "next-post-slug": "/post2"},
                "/post2": {"permalink": "/post2", "prev-post-slug": "/post3"},
            },
            "check_permalink": "/post1",
            "expected_errors": [
                "Post /post2 should have prev-post-slug=/post1; currently has /post3"
            ],
            "description": "incorrect reverse relationship",
        },
        # Test case 4: Non-existent target post
        {
            "posts": {
                "/post1": {
                    "permalink": "/post1",
                    "next-post-slug": "/nonexistent",
                },
            },
            "check_permalink": "/post1",
            "expected_errors": [
                "Could not find post with permalink /nonexistent"
            ],
            "description": "non-existent target post",
        },
        # Test case 5: Both prev and next relationships valid
        {
            "posts": {
                "/post1": {"permalink": "/post1", "next-post-slug": "/post2"},
                "/post2": {
                    "permalink": "/post2",
                    "prev-post-slug": "/post1",
                    "next-post-slug": "/post3",
                },
                "/post3": {"permalink": "/post3", "prev-post-slug": "/post2"},
            },
            "check_permalink": "/post2",
            "expected_errors": [],
            "description": "valid prev and next relationships",
        },
    ],
)
def test_check_sequence_relationships(test_case: Dict[str, Any]) -> None:
    """
    Test checking bidirectional relationships between posts using next/prev post slugs.

    Args:
        test_case: Dictionary containing test data including:
            - posts: Dictionary of posts with their metadata
            - check_permalink: Permalink of the post to check
            - expected_errors: List of expected error messages
            - description: Description of the test case
    """
    errors = check_sequence_relationships(
        test_case["check_permalink"], test_case["posts"]
    )
    assert errors == test_case["expected_errors"], (
        f"Failed test case: {test_case['description']}\n"
        f"Expected: {test_case['expected_errors']}\n"
        f"Got: {errors}"
    )


def test_check_sequence_relationships_invalid_input() -> None:
    """
    Test check_sequence_relationships with invalid input.
    """
    # Test with empty permalink
    with pytest.raises(ValueError, match="Invalid permalink"):
        check_sequence_relationships("", {})

    # Test with non-existent permalink
    with pytest.raises(ValueError, match="Invalid permalink /nonexistent"):
        check_sequence_relationships(
            "/nonexistent", {"/post1": {"permalink": "/post1"}}
        )


@pytest.mark.parametrize(
    "test_case",
    [
        # Test case 1: Matching titles
        {
            "current": {
                "next-post-title": "Next Post",
                "title": "Current Post",
            },
            "target": {"title": "Next Post"},
            "target_slug": "/next-post",
            "direction": "next",
            "expected_errors": [],
            "description": "matching titles",
        },
        # Test case 2: Mismatched titles
        {
            "current": {
                "next-post-title": "Expected Title",
                "title": "Current Post",
            },
            "target": {"title": "Actual Different Title"},
            "target_slug": "/next-post",
            "direction": "next",
            "expected_errors": [
                "next-post-title mismatch: expected 'Expected Title', but /next-post has title 'Actual Different Title'"
            ],
            "description": "mismatched titles",
        },
        # Test case 3: Missing title field in target
        {
            "current": {
                "prev-post-title": "Previous Post",
                "title": "Current Post",
            },
            "target": {},
            "target_slug": "/prev-post",
            "direction": "prev",
            "expected_errors": [
                "prev-post-title mismatch: expected 'Previous Post', but /prev-post has title ''"
            ],
            "description": "missing title in target",
        },
        # Test case 4: No title field in current post
        {
            "current": {"title": "Current Post"},
            "target": {"title": "Next Post"},
            "target_slug": "/next-post",
            "direction": "next",
            "expected_errors": [],
            "description": "no title field to check",
        },
        # Test case 5: Empty title in target
        {
            "current": {
                "next-post-title": "Expected Title",
                "title": "Current Post",
            },
            "target": {"title": ""},
            "target_slug": "/next-post",
            "direction": "next",
            "expected_errors": [
                "next-post-title mismatch: expected 'Expected Title', but /next-post has title ''"
            ],
            "description": "empty title in target",
        },
    ],
)
def test_check_post_titles(test_case: Dict[str, Any]) -> None:
    """
    Test checking titles between linked posts.

    Args:
        test_case: Dictionary containing test data including:
            - current: Metadata of the current post
            - target: Metadata of the target post
            - target_slug: Permalink of the target post
            - direction: Direction of the link ('next' or 'prev')
            - expected_errors: List of expected error messages
            - description: Description of the test case
    """
    errors = check_post_titles(
        test_case["current"],
        test_case["target"],
        test_case["target_slug"],
        test_case["direction"],
    )
    assert errors == test_case["expected_errors"], (
        f"Failed test case: {test_case['description']}\n"
        f"Expected: {test_case['expected_errors']}\n"
        f"Got: {errors}"
    )


@pytest.fixture
def create_test_file(tmp_path: Path) -> Callable[[str, str], Path]:
    """
    Fixture providing a function to create test markdown files with given content.
    """

    def _create_file(filename: str, content: str) -> Path:
        file_path = tmp_path / filename
        file_path.write_text(content)
        return file_path

    return _create_file


def test_build_sequence_data_basic(create_test_file: Callable) -> None:
    """
    Test basic functionality of _build_sequence_data with a single file.
    """
    content = """---
title: Test Post
permalink: /test
next-post-slug: /next
prev-post-slug: /prev
next-post-title: Next Post
prev-post-title: Previous Post
---
Test content
"""
    file_path = create_test_file("test.md", content)

    sequence_data = build_sequence_data([file_path])

    expected_mapping = {
        "/test": {
            "title": "Test Post",
            "next-post-slug": "/next",
            "prev-post-slug": "/prev",
            "next-post-title": "Next Post",
            "prev-post-title": "Previous Post",
        }
    }

    assert sequence_data == expected_mapping


def test_build_sequence_data_with_aliases(create_test_file: Callable) -> None:
    """
    Test _build_sequence_data with a file containing aliases.
    """
    content = """---
title: Test Post
permalink: /test
aliases: [/alias1, /alias2]
next-post-slug: /next
---
Test content
"""
    file_path = create_test_file("test.md", content)

    sequence_data = build_sequence_data([file_path])

    expected_mapping = {
        "/test": {"title": "Test Post", "next-post-slug": "/next"},
        "/alias1": {"title": "Test Post", "next-post-slug": "/next"},
        "/alias2": {"title": "Test Post", "next-post-slug": "/next"},
    }

    assert sequence_data == expected_mapping


def test_build_sequence_data_multiple_files(
    create_test_file: Callable,
) -> None:
    """
    Test _build_sequence_data with multiple files having different combinations of fields.
    """
    file1_content = """---
title: First Post
permalink: /first
next-post-slug: /second
next-post-title: Second Post
---
"""
    file2_content = """---
title: Second Post
permalink: /second
prev-post-slug: /first
prev-post-title: First Post
aliases: [/second-alias]
---
"""
    file3_content = """---
title: Third Post
permalink: /third
---
"""

    files = [
        create_test_file("first.md", file1_content),
        create_test_file("second.md", file2_content),
        create_test_file("third.md", file3_content),
    ]

    sequence_data = build_sequence_data(files)

    expected_mapping = {
        "/first": {
            "title": "First Post",
            "next-post-slug": "/second",
            "next-post-title": "Second Post",
        },
        "/second": {
            "title": "Second Post",
            "prev-post-slug": "/first",
            "prev-post-title": "First Post",
        },
        "/second-alias": {
            "title": "Second Post",
            "prev-post-slug": "/first",
            "prev-post-title": "First Post",
        },
        "/third": {"title": "Third Post"},
    }

    assert sequence_data == expected_mapping


def test_build_sequence_data_empty_cases(create_test_file: Callable) -> None:
    """
    Test _build_sequence_data with edge cases like empty metadata and empty aliases.
    """
    # File with empty metadata
    file1_content = """---
---
Content only
"""

    # File with empty alias
    file2_content = """---
title: Test Post
permalink: /test
aliases: [""]
---
"""

    files = [
        create_test_file("empty_meta.md", file1_content),
        create_test_file("empty_alias.md", file2_content),
    ]

    sequence_data = build_sequence_data(files)

    expected_mapping = {"/test": {"title": "Test Post"}}

    assert sequence_data == expected_mapping


def test_build_sequence_data_no_files() -> None:
    """
    Test _build_sequence_data with an empty list of files.
    """
    sequence_data = build_sequence_data([])
    assert sequence_data == {}

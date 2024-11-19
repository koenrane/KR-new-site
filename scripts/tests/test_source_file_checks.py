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

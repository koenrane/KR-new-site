import pytest
from pathlib import Path
import git
import sys
from typing import Dict, List

sys.path.append(str(Path(__file__).parent.parent))

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..source_file_checks import *
else:
    from source_file_checks import *


@pytest.fixture
def valid_metadata() -> Dict[str, str | List[str]]:
    """Fixture providing valid metadata that should pass all checks."""
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
            {"title": "", "description": "Test", "tags": [], "permalink": "/test"},
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
    Integration test for the main workflow.
    Tests both valid and invalid markdown files in the content directory.

    Args:
        tmp_path: Pytest fixture providing temporary directory
        monkeypatch: Pytest fixture for mocking
    """
    # Set up test directory structure
    content_dir = tmp_path / "content"
    content_dir.mkdir()

    # Initialize git repo
    repo = git.Repo.init(tmp_path)

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
    monkeypatch.setattr(script_utils, "get_git_root", lambda *args, **kwargs: tmp_path)

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
    """Test detection of duplicate URLs (permalinks and aliases)."""
    # Setup
    content_dir = tmp_path / "content"
    content_dir.mkdir()
    git.Repo.init(tmp_path)

    # Create test files
    for filename, content in test_case["files"].items():
        (content_dir / filename).write_text(content)

    # Mock git root to use our temporary directory
    monkeypatch.setattr(script_utils, "get_git_root", lambda *args, **kwargs: tmp_path)

    if test_case["should_fail"]:
        with pytest.raises(SystemExit, match="1"):
            main()
    else:
        main()  # Should not raise


def test_invalid_md_links(tmp_path: Path, monkeypatch) -> None:
    """Test detection of invalid markdown links."""
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
    monkeypatch.setattr(script_utils, "get_git_root", lambda *args, **kwargs: tmp_path)

    # Should exit with code 1 due to invalid links
    with pytest.raises(SystemExit, match="1"):
        main()

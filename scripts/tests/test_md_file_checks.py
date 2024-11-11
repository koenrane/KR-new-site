import pytest
from pathlib import Path
import git
import sys
from typing import Dict, List

sys.path.append(str(Path(__file__).parent.parent))

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..md_file_checks import *
else:
    from md_file_checks import *


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
    monkeypatch.setattr(script_utils, "get_git_root", lambda: tmp_path)

    # Main should exit with code 1 due to invalid file
    with pytest.raises(SystemExit) as exc_info:
        main()
    assert exc_info.value.code == 1

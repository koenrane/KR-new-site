import pytest
import os
from datetime import datetime
import yaml
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))

from .. import update_date_on_publish as update_lib


@pytest.fixture
def temp_content_dir(tmp_path):
    """Create a temporary content directory with test files"""
    content_dir = tmp_path / "content"
    content_dir.mkdir()
    return content_dir


def create_md_file(directory: Path, filename: str, frontmatter_content: dict) -> Path:
    """Helper to create markdown test files"""
    file_path = directory / filename
    content = "---\n"
    content += yaml.dump(frontmatter_content, sort_keys=False, allow_unicode=True)
    content += "---\n"
    content += "Test content"

    file_path.write_text(content, encoding="utf-8")
    return file_path


def test_adds_missing_date(temp_content_dir, monkeypatch):
    """Test that date is added when missing"""
    # Create test file without date
    test_file = create_md_file(
        temp_content_dir, "test1.md", {"title": "Test Post", "tags": ["test"]}
    )

    # Mock datetime.now() to return a fixed date
    fixed_date = datetime(2024, 2, 1)

    class MockDateTime:
        @staticmethod
        def now():
            return fixed_date

    # Fix: Use update_lib instead of update_date_on_publish
    monkeypatch.setattr(update_lib, "datetime", MockDateTime)

    # Run the update with the specific file
    update_lib.update_publish_date(test_file)

    # Verify results
    with test_file.open("r", encoding="utf-8") as f:
        content = f.read()
        metadata = yaml.safe_load(content.split("---")[1])

    assert metadata["date_published"] == "02/01/2024"


def test_preserves_existing_date(temp_content_dir):
    """Test that existing dates are not modified"""
    # Create test file with existing date
    existing_date = "12/25/2023"
    test_file = create_md_file(
        temp_content_dir,
        "test2.md",
        {"title": "Test Post", "date_published": existing_date},
    )

    # Run the update
    update_lib.update_publish_date(test_file)

    # Verify date wasn't changed
    with test_file.open("r", encoding="utf-8") as f:
        content = f.read()
        metadata = yaml.safe_load(content.split("---")[1])

    assert metadata["date_published"] == existing_date


def test_handles_empty_date(temp_content_dir, monkeypatch):
    """Test that empty dates are updated"""
    # Create test file with empty date
    test_file = create_md_file(
        temp_content_dir, "test3.md", {"title": "Test Post", "date_published": ""}
    )

    # Mock datetime.now()
    fixed_date = datetime(2024, 2, 1)

    class MockDateTime:
        @staticmethod
        def now():
            return fixed_date

    monkeypatch.setattr(update_lib, "datetime", MockDateTime)

    # Run the update
    update_lib.update_publish_date(test_file)

    # Verify results
    with test_file.open("r", encoding="utf-8") as f:
        content = f.read()
        metadata = yaml.safe_load(content.split("---")[1])

    assert metadata["date_published"] == "02/01/2024"


def test_handles_invalid_yaml(temp_content_dir):
    """Test handling of invalid YAML frontmatter"""
    # Create file with invalid YAML
    file_path = temp_content_dir / "invalid.md"
    file_path.write_text(
        """---
title: "Test Post
invalid: yaml: content:
---
Test content""",
        encoding="utf-8",
    )

    # Run the update and expect YAML error
    with pytest.raises(yaml.YAMLError):
        update_lib.update_publish_date(file_path)


def test_skips_missing_frontmatter(temp_content_dir, capsys):
    """Test that files without frontmatter are skipped"""
    # Create file without frontmatter
    test_file = temp_content_dir / "no_frontmatter.md"
    test_file.write_text("Just some content\nwithout any frontmatter", encoding="utf-8")

    # Run the update
    update_lib.update_publish_date(test_file)

    # Check that warning was printed
    captured = capsys.readouterr()
    assert f"Skipping {test_file}: No valid frontmatter found" in captured.out

    # Verify file wasn't modified
    assert (
        test_file.read_text(encoding="utf-8")
        == "Just some content\nwithout any frontmatter"
    )

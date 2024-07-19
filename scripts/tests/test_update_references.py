from .. import update_references
import pytest
from pathlib import Path

# --- Test Cases ---

test_cases = [
    ("test.md", "![Image](/old_image.jpg)", "![Image](/new_image.jpg)"),
    (
        "test.md",
        '<img src="old_image.jpg"> abc',
        '<img src="new_image.jpg"> abc',
    ),
    (
        "test.md",
        "![image1](/old_image.jpg) ![image2](/old_image.jpg)",
        "![image1](/new_image.jpg) ![image2](/new_image.jpg)",
    ),
]


# --- Fixtures ---


@pytest.fixture(autouse=True)
def temp_dir(tmp_path: Path):
    """Fixture to create a temporary directory with a test file and subdirectory."""
    content_dir = tmp_path / "content"
    content_dir.mkdir()
    (content_dir / "test.md").touch()  # Create but don't write yet
    (content_dir / "test_dir").mkdir()
    (content_dir / "test_dir" / "test2.md").touch()
    return tmp_path


# --- Tests ---


@pytest.mark.parametrize(
    "filename, original_content, expected_content", test_cases
)
def test_update_references(
    temp_dir: Path,  # Use the fixture directly
    temp_image: Path,
    filename,
    original_content,
    expected_content,
):
    """Parameterized test for updating markdown and HTML image references."""
    file_path = temp_dir / "content" / filename  # Correct file path
    file_path.write_text(original_content)

    update_references.update_references(
        temp_image, Path("new_image.jpg"), temp_dir / "content"
    )

    with open(file_path, "r") as f:
        updated_content = f.read()

    assert updated_content == expected_content


def test_update_references_multiple_files(temp_dir: Path, temp_image: Path):
    """Test updating references across multiple files."""
    update_references.update_references(
        temp_image, Path("new_image.jpg"), temp_dir / "content"
    )

    total_matches = 0
    for md_file in (temp_dir / "content").glob("**/*.md"):
        with open(md_file, "r") as f:
            total_matches += f.read().count("new_image.jpg")
    assert total_matches == 2  # 2 occurrences in 2 files


def test_update_references_no_matches(temp_dir: Path):
    """Test graceful handling when no references are found."""
    (temp_dir / "content/test.md").write_text("No references here")

    update_references.update_references(
        Path("nonexistent_file.jpg"),
        Path("new_image.jpg"),
        temp_dir / "content",  # Use temp_dir / "content"
    )

    with open(
        temp_dir / "content/test.md", "r"
    ) as f:  # Use temp_dir / "content/test.md"
        content = f.read()
        assert "new_image.jpg" not in content


def test_update_references_filenames_with_spaces(temp_dir: Path):
    """Test handling of file names with spaces."""
    image_path = temp_dir / "quartz/old image.jpg"
    image_path.parent.mkdir(parents=True)
    image_path.touch()

    (temp_dir / "content/test.md").write_text("![image](/old image.jpg)")

    update_references.update_references(
        image_path, Path("new image.jpg"), temp_dir / "content"
    )

    with open(temp_dir / "content/test.md", "r") as f:
        content = f.read()
        assert "![image](/new image.jpg)" in content

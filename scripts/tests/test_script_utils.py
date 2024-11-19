"""
Test the utilities used for running the tests :)
"""

import subprocess
from pathlib import Path
from typing import Optional
from unittest import mock

import git
import pytest

from .. import utils as script_utils


def test_git_root_is_ancestor(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Test that the found git root is an ancestor of the current file.
    """
    monkeypatch.setattr(script_utils, "get_git_root", lambda: tmp_path)
    current_file_path = tmp_path / "tests" / "test_utils.py"
    current_file_path.parent.mkdir(parents=True)
    current_file_path.touch()

    git_root = script_utils.get_git_root()
    assert git_root is not None
    assert current_file_path.is_relative_to(git_root)


def test_find_git_root(monkeypatch: pytest.MonkeyPatch) -> None:
    expected_output = "/path/to/git/root"

    def mock_subprocess_run(*args, **kwargs) -> subprocess.CompletedProcess:
        return subprocess.CompletedProcess(
            args=args,
            returncode=0,
            stdout=expected_output,
        )

    monkeypatch.setattr(script_utils.subprocess, "run", mock_subprocess_run)
    assert script_utils.get_git_root() == Path(expected_output)


def test_get_git_root_raises_error():
    def mock_subprocess_run(*args, **kwargs) -> subprocess.CompletedProcess:
        return subprocess.CompletedProcess(
            args=args,
            returncode=1,
            stdout="",
        )

    with mock.patch.object(script_utils.subprocess, "run", mock_subprocess_run):
        with pytest.raises(RuntimeError):
            script_utils.get_git_root()


@pytest.mark.parametrize(
    "input_path,expected_output,should_raise",
    [
        (
            "/home/user/quartz/static/images/test.png",
            Path("quartz/static/images/test.png"),
            False,
        ),
        ("/home/user/projects/other/file.txt", None, True),
        ("/home/user/quartz/content/notes.md", None, True),
        (
            "/home/user/quartz/static/deeply/nested/folder/image.jpg",
            Path("quartz/static/deeply/nested/folder/image.jpg"),
            False,
        ),
        (
            "/quartz/static/root-level.png",
            Path("quartz/static/root-level.png"),
            False,
        ),
        (
            "/path/to/quartz/static/videos/demo.mp4",
            Path("quartz/static/videos/demo.mp4"),
            False,
        ),
        (
            "/path/to/quartz/static/documents/report.pdf",
            Path("quartz/static/documents/report.pdf"),
            False,
        ),
        (
            "/path/to/quartz/not-static/image.png",
            None,
            True,
        ),
        (
            "/path/to/not-quartz/static/image.png",
            None,
            True,
        ),
        (
            "/home/user/quartz/static",
            None,
            True,
        ),
        (
            "relative/path/quartz/static/image.png",
            Path("quartz/static/image.png"),
            False,
        ),
    ],
)
def test_path_relative_to_quartz(
    input_path: str, expected_output: Optional[Path], should_raise: bool
) -> None:
    """Test path_relative_to_quartz_parent with various input paths.

    Args:
        input_path: The input path to test
        expected_output: The expected output Path, or None if should raise
        should_raise: Whether the function should raise a ValueError
    """
    if should_raise:
        with pytest.raises(ValueError):
            script_utils.path_relative_to_quartz_parent(Path(input_path))
    else:
        assert (
            script_utils.path_relative_to_quartz_parent(Path(input_path))
            == expected_output
        )


def test_get_files_no_dir():
    """Test when no directory is provided."""
    result = script_utils.get_files()
    assert isinstance(result, tuple)
    assert not result  # Empty tuple since no directory was given


@pytest.mark.parametrize(
    "file_paths, expected_files",
    [
        (["test.md", "test.txt"], ["test.md"]),
        (
            ["subdir1/test1.md", "subdir1/test1.txt", "subdir2/test2.md"],
            ["subdir1/test1.md", "subdir2/test2.md"],
        ),
        (
            ["test.md", "test.txt", "image.jpg", "document.pdf"],
            ["test.md", "test.txt"],
        ),
    ],
)
def test_get_files_specific_dir(tmp_path, file_paths, expected_files):
    """Test file discovery by inferring structure from file paths."""
    # Create test files and directories
    for file_path in file_paths:
        file: Path = tmp_path / file_path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.touch()  # Just create empty files

    # Get files based on the file extensions in the file paths
    filetypes_to_match = list({p.suffix for p in map(Path, expected_files)})
    result = script_utils.get_files(
        dir_to_search=tmp_path, filetypes_to_match=filetypes_to_match
    )

    # Normalize file paths and compare
    result = [str(p.relative_to(tmp_path)) for p in result]
    assert sorted(result) == sorted(expected_files)


def test_get_files_gitignore(tmp_path):
    """Test with a .gitignore file."""
    try:
        # Create a git repository in tmp_path
        repo = git.Repo.init(tmp_path)
        (tmp_path / ".gitignore").write_text("*.txt\n")  # Ignore text files

        md_file = tmp_path / "test.md"
        txt_file = tmp_path / "test.txt"
        md_file.write_text("Markdown content")
        txt_file.write_text("Text content")
        repo.index.add([".gitignore", "test.md", "test.txt"])
        repo.index.commit("Initial commit")

        # Test getting files with gitignore
        result = script_utils.get_files(dir_to_search=tmp_path)
        assert len(result) == 1
        assert result[0] == md_file
    except git.GitCommandError:
        pytest.skip("Git not installed or not in PATH")


def test_get_files_ignore_dirs(tmp_path):
    """Test that specified directories are ignored."""
    # Create test directory structure
    templates_dir = tmp_path / "templates"
    regular_dir = tmp_path / "regular"
    nested_templates = tmp_path / "docs" / "templates"

    # Create directories
    for dir_path in [templates_dir, regular_dir, nested_templates]:
        dir_path.mkdir(parents=True, exist_ok=True)

    # Create test files
    test_files = [
        templates_dir / "template.md",
        regular_dir / "regular.md",
        nested_templates / "nested.md",
        tmp_path / "root.md",
    ]

    for file in test_files:
        file.write_text("test content")

    # Get files, ignoring 'templates' directories
    result = script_utils.get_files(
        dir_to_search=tmp_path, filetypes_to_match=(".md",), ignore_dirs=["templates"]
    )

    # Convert results to set of strings for easier comparison
    result_paths = {str(p.relative_to(tmp_path)) for p in result}

    # Expected files (only files not in 'templates' directories)
    expected_paths = {"regular/regular.md", "root.md"}

    assert result_paths == expected_paths

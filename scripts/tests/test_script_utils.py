from pathlib import Path
from .. import utils as script_utils


def test_git_root_is_ancestor():
    # Get the current file's directory (i.e. of this file)
    current_file_path = Path(__file__).resolve()

    # Get the Git root
    git_root = script_utils.get_git_root()

    # Check if git_root is not None
    assert git_root is not None, "Git root should not be None"

    # Check if git_root is an ancestor of the current file
    assert current_file_path.is_relative_to(
        git_root
    ), f"Git root {git_root} should be an ancestor of {current_file_path}"

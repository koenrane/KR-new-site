import git
from pathlib import Path
import subprocess
from typing import Optional, Collection

# pyright: reportPrivateImportUsage = false


def get_git_root() -> Path | None:
    """Returns the absolute path to the top-level directory of the Git repository."""
    completed_process = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True
    )
    return (
        Path(completed_process.stdout.strip())
        if completed_process.returncode == 0
        else None
    )


def get_files(
    replacement_dir: Optional[Path] = None,
    filetypes_to_match: Collection[str] = ("md",),
) -> tuple[Path, ...]:
    """Returns a tuple of all files in the content directory of the Git
    repository.

    Args:
        replacement_dir (Path): A directory to search for files.
        filetypes_to_match (Collection[str]): A collection of file types to
            search for.

    Returns:
        tuple[Path, ...]: A tuple of all matching files in the content directory of the
            Git repository. Filters out ignored files if a Git repository is found.
    """
    filetype_pattern: str = f"*.({'|'.join(filetypes_to_match)})"
    if replacement_dir:
        files = tuple(replacement_dir.rglob(filetype_pattern))
        return tuple(filter(lambda file: file.is_file(), files))
    else:
        root = get_git_root()
        repo = git.Repo(root)
        files = (
            tuple((root / "content").rglob(filetype_pattern))
            if root
            else tuple()
        )
        return tuple(
            filter(lambda file: not file in repo.ignored(file), files)
        )


def path_relative_to_quartz(input_file: Path) -> Path:
    try:
        # Find the 'quartz' directory in the path
        quartz_dir = next(
            parent for parent in input_file.parents if parent.name == "quartz"
        )
        # Check if the path is within the 'static' subdirectory
        if not any(
            parent.name == "static"
            for parent in input_file.parents
            if parent != quartz_dir
        ):
            raise ValueError(
                "The path must be within the 'static' subdirectory of 'quartz'."
            )
        # Get the path relative to quartz
        return input_file.relative_to(quartz_dir.parent)
    except StopIteration:
        raise ValueError("The path must be within a 'quartz' directory.")

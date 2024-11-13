import git
from pathlib import Path
import subprocess
from typing import Optional, Collection
from ruamel.yaml import YAML

# pyright: reportPrivateImportUsage = false


def get_git_root(starting_dir: Optional[Path] = None) -> Path:
    """Returns the absolute path to the top-level directory of the Git repository.

    Args:
        starting_dir (Optional[Path]): Directory from which to start searching for the Git root.

    Returns:
        Path: Absolute path to the Git repository root.

    Raises:
        RuntimeError: If Git root cannot be determined.
    """
    completed_process = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
        cwd=starting_dir if starting_dir else Path.cwd(),
    )
    if completed_process.returncode == 0:
        return Path(completed_process.stdout.strip())
    else:
        raise RuntimeError("Failed to get Git root")


def get_files(
    dir_to_search: Optional[Path] = None,
    filetypes_to_match: Collection[str] = (".md",),
    use_git_ignore: bool = True,
    ignore_dirs: Optional[Collection[str]] = None,
) -> tuple[Path, ...]:
    """Returns a tuple of all files in the specified directory of the Git repository.

    Args:
        dir_to_search (Optional[Path]): A directory to search for files.
        filetypes_to_match (Collection[str]): A collection of file types to search for.
        use_git_ignore (bool): Whether to exclude files based on .gitignore.
        ignore_dirs (Optional[Collection[str]]): Directory names to ignore.

    Returns:
        tuple[Path, ...]: A tuple of all matching files.
    """
    files: list[Path] = []
    if dir_to_search is not None:
        for filetype in filetypes_to_match:
            files.extend(dir_to_search.rglob(f"*{filetype}"))

        # Filter out ignored directories
        if ignore_dirs:
            files = [
                f
                for f in files
                if not any(ignore_dir in f.parts for ignore_dir in ignore_dirs)
            ]

        if use_git_ignore:
            try:
                root = get_git_root(starting_dir=dir_to_search)
                repo = git.Repo(root)
                # Convert file paths to paths relative to the git root
                relative_files = [file.relative_to(root) for file in files]
                # Filter out ignored files
                files = [
                    file
                    for file, rel_file in zip(files, relative_files)
                    if not repo.ignored(rel_file)
                ]
            except (git.GitCommandError, ValueError, RuntimeError):
                pass  # If Git root is not found or any error occurs, skip gitignore filtering
    return tuple(files)


def path_relative_to_quartz_parent(input_file: Path) -> Path:
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
    except StopIteration as e:
        raise ValueError("The path must be within a 'quartz' directory.") from e


def split_yaml(file_path: Path) -> tuple[dict, str]:
    """Split a markdown file into its YAML frontmatter and content.

    Args:
        file_path: Path to the markdown file

    Returns:
        Tuple of (metadata dict, content string)
    """
    yaml = YAML(typ="rt")  # 'rt' means round-trip, preserving comments and formatting
    yaml.preserve_quotes = True  # Preserve quote style

    with file_path.open("r", encoding="utf-8") as f:
        content = f.read()

    # Split frontmatter and content
    parts = content.split("---", 2)
    if len(parts) < 3:
        print(f"Skipping {file_path}: No valid frontmatter found")
        return {}, ""

    # Parse YAML frontmatter
    try:
        metadata = yaml.load(parts[1])
        if not metadata:
            metadata = {}
    except Exception as e:
        print(f"Error parsing YAML in {file_path}: {str(e)}")
        return {}, ""

    return metadata, parts[2]

#!/usr/bin/env python3
import shutil
import argparse
import subprocess
from pathlib import Path
import re
from typing import Optional, Sequence
import os


# Add this function at the beginning of the file
def get_home_directory():
    return os.environ.get("HOME", os.path.expanduser("~"))


try:
    from . import utils as script_utils
except ImportError:
    import utils as script_utils  # type: ignore

R2_BASE_URL: str = "https://assets.turntrout.com"
R2_BUCKET_NAME: str = "turntrout"
R2_MEDIA_DIR: Path = Path(get_home_directory()) / "Downloads" / "website-media-r2"


def get_r2_key(filepath: Path) -> str:
    # Convert Path to string and remove everything up to and including 'quartz/'
    key = re.sub(r".*quartz/", "", str(filepath))
    # Remove leading '/' if present
    return re.sub(r"^/", "", key)


def check_exists_on_r2(upload_target: str, verbose: bool = False) -> bool:
    """
    Check if a file exists in R2 storage.

    Args:
        upload_target (str): The R2 target path to check.
        verbose (bool): Whether to print verbose output.

    Returns:
        bool: True if the file exists, False otherwise.

    Raises:
        RuntimeError: If the check operation fails.
    """
    try:
        # Extract the bucket and key from the upload_target
        _, _, path = upload_target.partition(":")
        bucket, _, key = path.partition("/")

        result = subprocess.run(
            ["rclone", "ls", f"r2:{bucket}"],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode == 0 and key in result.stdout:
            if verbose:
                print(f"File found in R2: {upload_target}")
            return True
        else:
            if verbose:
                print(f"No existing file found in R2: {upload_target}")
            return False
    except Exception as e:
        raise RuntimeError(f"Failed to check existence of file in R2: {e}") from e


def upload_and_move(
    file_path: Path,
    verbose: bool = False,
    replacement_dir: Optional[Path] = None,
    move_to_dir: Optional[Path] = None,
    overwrite_existing: bool = False,
) -> None:
    """
    Upload a file to R2 storage and update references.

    Args:
        file_path (Path): The file to upload.
        verbose (bool): Whether to print verbose output.
        replacement_dir (Path): Directory to search for files to update references.
        move_to_dir (Path): The local directory to move the file to after upload.
        overwrite_existing (bool): Whether to overwrite existing files in R2.

    Raises:
        ValueError: If the file path does not contain 'quartz/'.
        RuntimeError: If the rclone command fails or if the file already exists and overwrite is not allowed.
        FileNotFoundError: If the original file cannot be moved.
    """
    if move_to_dir is None:
        move_to_dir = R2_MEDIA_DIR

    if "quartz/" not in str(file_path):
        raise ValueError("Error: File path does not contain 'quartz/'.")

    if not file_path.is_file():
        raise FileNotFoundError(f"Error: File not found: {file_path}")

    relative_path = script_utils.path_relative_to_quartz(file_path)
    r2_key: str = get_r2_key(relative_path)

    upload_target: str = f"r2:{R2_BUCKET_NAME}/{r2_key}"

    # Check if the file already exists in R2
    file_exists = check_exists_on_r2(upload_target, verbose)
    if file_exists:
        if not overwrite_existing:
            raise RuntimeError(
                f"Error: File '{r2_key}' already exists in R2. Use '--overwrite-existing' to overwrite."
            )
        elif verbose:
            print(f"Overwriting existing file in R2: {r2_key}")

    if verbose:
        print(f"Uploading {file_path} to R2 with key: {r2_key}")

    try:
        subprocess.run(["rclone", "copyto", str(file_path), upload_target], check=True)
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Failed to upload file to R2: {e}") from e

    # Update references in markdown files
    relative_original_path: Path = script_utils.path_relative_to_quartz(file_path)
    # References start with 'static', generally
    relative_subpath: Path = Path(
        *relative_original_path.parts[relative_original_path.parts.index("static") :]
    )
    r2_address: str = f"{R2_BASE_URL}/{r2_key}"
    if verbose:
        print(f'Changing "{relative_subpath}" references to "{r2_address}"')
    for text_file_path in script_utils.get_files(replacement_dir, (".md",)):
        with open(text_file_path, "r", encoding="utf-8") as f:
            file_content: str = f.read()

        # Check original_path because it's longer than subpath
        escaped_original_path: str = re.escape(str(relative_original_path))
        escaped_relative_subpath: str = re.escape(str(relative_subpath))
        new_content: str = re.sub(
            rf"(?<=[\(\"])(?:\.?/)?(?:{escaped_original_path}|{escaped_relative_subpath})",
            r2_address,
            file_content,
        )
        with open(text_file_path, "w", encoding="utf-8") as f:
            f.write(new_content)

    if move_to_dir:
        if verbose:
            print(f"Moving original file: {file_path}")
        # Create the directory structure in the target location
        git_root = script_utils.get_git_root()
        if git_root is None:
            raise RuntimeError("Failed to get git root")

        # absolute() ensures that there is overlap between the two paths
        relative_path = file_path.absolute().relative_to(git_root)
        target_path = move_to_dir / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(file_path), str(target_path))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-r",
        "--replacement-dir",
        type=Path,
        default=Path(f"{script_utils.get_git_root()}") / "content",
        help="Directory to search for files to update references",
    )
    parser.add_argument(
        "-m",
        "--move-to-dir",
        type=Path,
        default=None,
        help="Move file to directory after upload",
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true", help="Enable verbose output"
    )
    parser.add_argument(
        "-u",
        "--upload-from-directory",
        type=Path,
        default=None,
        help="Upload all files of specified types from the given directory",
    )
    parser.add_argument(
        "-t",
        "--filetypes",
        nargs="+",
        default=(".mp4", ".svg", ".avif"),
        help="File types to upload when using --all (default: .mp4 .svg .avif)",
    )
    parser.add_argument(
        "--overwrite-existing",
        action="store_true",
        help="Overwrite existing files in R2 if they already exist",
    )
    parser.add_argument("file", type=Path, nargs="?", help="File to upload")
    args = parser.parse_args()

    files_to_upload: Sequence[Path] = []
    if args.upload_from_directory:
        files_to_upload = script_utils.get_files(
            args.upload_from_directory,
            args.filetypes,
        )
    elif args.file:
        files_to_upload = [args.file]
    else:
        parser.error("Either --upload_from_directory or a file must be specified")

    for file_to_upload in files_to_upload:
        upload_and_move(
            file_to_upload,
            verbose=args.verbose,
            replacement_dir=args.replacement_dir,
            move_to_dir=args.move_to_dir,
            overwrite_existing=args.overwrite_existing,  # Pass the new flag
        )


if __name__ == "__main__":
    main()

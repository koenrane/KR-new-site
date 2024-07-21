#!/usr/bin/env python3
import shutil
import utils as script_utils
import argparse
import subprocess
from pathlib import Path, PurePath
import re
from typing import Optional

R2_BASE_URL: str = "https://assets.turntrout.com"
R2_BUCKET_NAME: str = "turntrout"
R2_MEDIA_DIR: Path = Path("$HOME/Downloads/website-media-r2")


def _get_r2_key(filepath: Path) -> str:
    # Convert Path to string and remove everything up to and including 'quartz/'
    key = re.sub(r".*quartz/", "", str(filepath))
    # Remove leading '/' if present
    return re.sub(r"^/", "", key)


def upload_and_move(
    file_path: Path,
    verbose: bool = False,
    replacement_dir: Optional[Path] = None,
    move_to_dir: Optional[Path] = R2_MEDIA_DIR,
) -> None:
    """
    Upload a file to R2 storage and update references.

    Args:
        file_path (Path): The file to upload.
        verbose (bool): Whether to print verbose output.
        move_to_dir (Path): The local directory to move the file to after upload.

    Raises:
        ValueError: If the file path does not contain 'quartz/'.
        RuntimeError: If the rclone command fails.
        FileNotFoundError: If the original file cannot be moved.
    """
    if not "quartz/" in str(file_path):
        raise ValueError("Error: File path does not contain 'quartz/'.")
    if not file_path.is_file():
        raise FileNotFoundError(f"Error: File not found: {file_path}")
    relative_path = script_utils.path_relative_to_quartz(file_path)
    r2_key: str = _get_r2_key(relative_path)

    if verbose:
        print(f"Uploading {file_path} to R2 with key: {r2_key}")

    upload_target: str = f"r2:{R2_BUCKET_NAME}/{r2_key}"
    try:
        subprocess.run(
            ["rclone", "copyto", str(file_path), upload_target], check=True
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Failed to upload file to R2: {e}")

    r2_address: str = f"{R2_BASE_URL}/{r2_key}"
    if verbose:
        print(f'Changing "{file_path}" references to {r2_address}')

    # Update references in markdown files
    replacement_path: Path = script_utils.path_relative_to_quartz(file_path)
    for text_file_path in script_utils.get_files(replacement_dir, ("md",)):
        with open(text_file_path, "r") as f:
            file_content: str = f.read()
        new_content: str = re.sub(
            str(replacement_path), r2_address, file_content
        )
        with open(text_file_path, "w") as f:
            f.write(new_content)

    if move_to_dir:
        if verbose:
            print(f"Moving original file: {file_path}")
        shutil.move(str(file_path), str(move_to_dir / file_path.name))


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
        help="Move file to directory after upload",
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true", help="Enable verbose output"
    )
    parser.add_argument("file", type=Path, help="File to upload")
    args = parser.parse_args()

    if args.file.is_file():
        upload_and_move(
            args.file,
            verbose=args.verbose,
            move_to_dir=args.move_to_dir,
        )
    else:
        raise FileNotFoundError(f"Error: File not found: {args.file}")


if __name__ == "__main__":
    main()

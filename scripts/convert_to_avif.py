#!/usr/bin/env python3
import argparse
import sys
import subprocess
from pathlib import Path


def compress(image_path: Path, quality: int = 21) -> None:
    """Converts an image to AVIF format using ImageMagick.

    Args:
        image_path: The path to the image file.
        quality: The AVIF quality (0-100). Lower is better but slower.
    """

    if not image_path.is_file():
        raise FileNotFoundError(f"Error: File '{image_path}' not found.")

    avif_path: Path = image_path.with_suffix(".avif")
    if avif_path.exists():
        print(
            f"AVIF file '{avif_path}' already exists. Skipping conversion.",
            file=sys.stderr,
        )
        return

    try:
        command: list[str | Path] = [
            "magick",
            image_path,
            "-quality",
            str(quality),
            avif_path,
        ]
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Error during conversion: {e}") from e


if __name__ == "__main__":
    parser: argparse.ArgumentParser = argparse.ArgumentParser(
        description="Convert image to AVIF format."
    )
    parser.add_argument(
        "image_path", type=Path, help="Path to the image file to convert."
    )
    parser.add_argument(
        "-q",
        "--quality",
        type=int,
        default=50,
        help="AVIF quality (0-100)",
    )
    parser.add_argument(
        "--run_script",
        action="store_true",
        help="Run the script directly (for testing purposes).",
    )
    args: argparse.Namespace = parser.parse_args()

    if args.run_script:
        compress(args.image_path, args.quality)
    else:
        print(
            "This script is designed to be run directly. Please use the --run_script flag.",
            file=sys.stderr,
        )
        raise SystemExit(1)  # Indicate an error exit

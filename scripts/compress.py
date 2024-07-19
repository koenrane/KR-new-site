#!/usr/bin/env python3
import argparse
import sys
import subprocess
from pathlib import Path
from typing import Sequence

QUALITY: int = 21  # Default quality
ALLOWED_IMAGE_EXTENSIONS: Sequence[str] = (".jpg", ".jpeg", ".png")


def image(image_path: Path, quality: int = QUALITY) -> None:
    """Converts an image to AVIF format using ImageMagick.

    Args:
        image_path: The path to the image file.
        quality: The AVIF quality (0-100). Lower is better but slower.
    """
    if not image_path.is_file():
        raise FileNotFoundError(f"Error: File '{image_path}' not found.")
    if not image_path.suffix.lower() in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError(
            f"Error: Unsupported file type '{image_path.suffix}'."
        )

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


VIDEO_EXTENSIONS_TO_CONVERT: Sequence[str] = (
    "gif",
    "mov",
    "mp4",
    "avi",
    "mpeg",
)


def video(video_path: Path, quality: int = QUALITY) -> None:
    """Converts a video to WebM format using ffmpeg.

    Args:
        video_path: The path to the video file.
        quality: The WebM quality (0-63). Lower is better but slower. Defaults to QUALITY.
    """
    if not video_path.is_file():
        raise FileNotFoundError(f"Error: Input file '{video_path}' not found.")

    file_extension: str = video_path.suffix.lstrip(".")

    if file_extension not in VIDEO_EXTENSIONS_TO_CONVERT:
        raise ValueError(
            f"Error: Unsupported file type '{file_extension}'. Supported types are: {', '.join(VIDEO_EXTENSIONS_TO_CONVERT)}."
        )

    webm_path: Path = video_path.with_suffix(".webm")

    # Two-pass encoding (overwrites existing file)
    encoding = "libvpx-vp9"
    try:
        # First pass (Video Only)
        subprocess.run(
            [
                "ffmpeg",  # The command-line tool for video processing
                "-i",
                video_path,  # Input video file
                "-y",  # Overwrite output files without asking
                "-c:v",
                encoding,  # Use libvpx-vp9 codec for video encoding (good for WebM)
                "-crf",
                str(
                    quality
                ),  # Constant Rate Factor (CRF) controls quality (lower is better)
                "-b:v",
                "0",  # Disable bitrate control (since we're using CRF)
                "-pass",
                "1",  # First pass for analysis (no video output)
                "-loglevel",
                "fatal",  # Suppress most messages, only show errors
                "-an",  # Disable audio processing (for this pass)
                "-f",
                "null",  # Output format is null
                "/dev/null",  # Discard output (since we're only analyzing)
            ],
            check=True,
        )

        # Second pass (Video and Audio)
        subprocess.run(
            [
                "ffmpeg",  # The command-line tool for video processing
                "-i",
                video_path,  # Input video file
                "-y",  # Overwrite output files without asking
                "-c:v",
                encoding,  # Use libvpx-vp9 codec for video encoding
                "-c:a",
                "libopus",  # Use libopus codec for audio encoding (good for WebM)
                "-crf",
                str(quality),  # Constant Rate Factor (CRF) controls quality
                "-b:v",
                "0",  # Disable bitrate control (since we're using CRF)
                "-pass",
                "2",  # Second pass for actual encoding using analysis from pass 1
                "-auto-alt-ref",
                "1",  # Enable automatic alt-ref frames (improves quality)
                "-row-mt",
                "1",  # Enable row-based multithreading (can speed up encoding)
                "-loglevel",
                "fatal",  # Suppress most messages, only show errors
                "-movflags",
                "faststart",  # Optimize for fast start-up playback in web browsers
                webm_path,  # Output WebM file
            ],
            check=True,
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Error during conversion: {e}") from e
    finally:
        # Cleanup after both passes
        log_file: Path = Path("ffmpeg2pass-0.log")
        if log_file.exists():
            log_file.unlink()  # Delete the log file


if __name__ == "__main__":
    parser: argparse.ArgumentParser = argparse.ArgumentParser(
        description="Compress the asset."
    )
    parser.add_argument(
        "path", type=Path, help="Path to the file to compress."
    )
    parser.add_argument(
        "-q",
        "--quality",
        type=int,
        default=QUALITY,
        help="Quality (0-100)",
    )
    parser.add_argument(
        "--run_script",
        action="store_true",
        help="Run the script directly.",
    )
    args: argparse.Namespace = parser.parse_args()

    if args.run_script:
        image(args.path, args.quality)
    else:
        print(
            "This script is designed to be run directly. Please use the --run_script flag.",
            file=sys.stderr,
        )
        raise SystemExit(1)  # Indicate an error exit

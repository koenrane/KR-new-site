#!/usr/bin/env python3
import argparse
import sys
import subprocess
from pathlib import Path
from typing import Collection

IMAGE_QUALITY: int = 56  # Default quality (higher is larger file size but better quality)
ALLOWED_IMAGE_EXTENSIONS: Collection[str] = (".jpg", ".jpeg", ".png")


def image(image_path: Path, quality: int = IMAGE_QUALITY) -> None:
    """Converts an image to AVIF format using ImageMagick.

    Args:
        image_path: The path to the image file.
        quality: The AVIF quality (0-100). Lower is better but slower.
    """
    if not image_path.is_file():
        raise FileNotFoundError(f"Error: File '{image_path}' not found.")
    if not image_path.suffix.lower() in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError(f"Error: Unsupported file type '{image_path.suffix}'.")

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


ALLOWED_VIDEO_EXTENSIONS: Collection[str] = (
    ".gif",
    ".mov",
    ".mp4",
    ".webm",
    ".avi",
    ".mpeg",
)

ALLOWED_EXTENSIONS: Collection[str] = (
    ALLOWED_IMAGE_EXTENSIONS + ALLOWED_VIDEO_EXTENSIONS
)


VIDEO_QUALITY: int = 23  # Default quality (0-51). Lower is better but slower.
def video(video_path: Path, quality: int = VIDEO_QUALITY) -> None:
    """Converts a video to mp4 format using ffmpeg with HEVC encoding if not already HEVC.

    Args:
        video_path: The path to the video file.
        quality: The HEVC quality (0-51). Lower is better but slower.
    """
    if not video_path.is_file():
        raise FileNotFoundError(f"Error: Input file '{video_path}' not found.")

    if video_path.suffix not in ALLOWED_VIDEO_EXTENSIONS:
        raise ValueError(
            f"Error: Unsupported file type '{video_path.suffix}'. Supported types are: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}."
        )

    # Check if the input is already HEVC encoded
    probe_cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=codec_name",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path)
    ]
    
    try:
        codec = subprocess.check_output(probe_cmd, universal_newlines=True).strip()
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Error probing video codec: {e}")

    if codec == "hevc":
        print(f"File {video_path} is already HEVC encoded. Skipping conversion.")
        return

    # Determine output path
    output_path = video_path.with_suffix(".mp4")
    if video_path.suffix.lower() == '.mp4':
        temp_output_path = video_path.with_stem(video_path.stem + "_temp")
    else:
        temp_output_path = output_path

    try:
        if video_path.suffix == ".gif":
            _compress_gif(video_path, quality)
        else:
            # Single pass encoding
            subprocess.run(
            [
                "ffmpeg",
                "-i", str(video_path),
                "-c:v",  "libx265",
                "-preset", "slow",
                "-crf", str(quality),
                "-c:a", "copy",  # Copy audio without re-encoding
                "-tag:v", "hvc1",  # For better compatibility with Apple devices
                "-movflags", "+faststart",
                "-colorspace", "bt709",
                str(temp_output_path)
            ],
            check=True,
        )

        # If we're overwriting the original file, replace it now
        if output_path == video_path:
            video_path.unlink()
            temp_output_path.rename(output_path)

    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Error during conversion: {e.stderr}") from e
    finally:
        original_path = output_path.with_name(output_path.name + "_original")
        if original_path.exists():
            original_path.unlink()

    print(f"Successfully converted {video_path} to HEVC: {output_path}")

def _compress_gif(gif_path: Path, quality: int = VIDEO_QUALITY) -> None:
    """
    Compress a GIF file to an MP4 video.

    This function converts a GIF file to an MP4 video using FFmpeg. It extracts frames
    from the GIF, converts them to an MP4 video with the specified quality, and then
    cleans up the temporary files.
    """
    # Extract frames from GIF
    subprocess.run([
        "ffmpeg",
        "-i", str(gif_path),
        f"{gif_path.parent / gif_path.stem}_%03d.png"
    ], check=True)

    try:
        # Convert frames to MP4
        output_path = gif_path.with_suffix(".mp4")
        subprocess.run([
            "ffmpeg",
            "-i", f"{gif_path.parent / gif_path.stem}_%03d.png",
            "-c:v", "libx265",
            "-crf", str(quality),
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", # Ensure dimensions are even
            "-pix_fmt", "yuv420p", # Chroma subsampling
            str(output_path)
        ], check=True)
    finally: # Clean up temporary PNG files
        for png_file in gif_path.parent.glob(f"{gif_path.stem}_*.png"):
            png_file.unlink()


if __name__ == "__main__":
    parser: argparse.ArgumentParser = argparse.ArgumentParser(
        description="Compress the asset."
    )
    parser.add_argument("path", type=Path, help="Path to the file to compress.")
    parser.add_argument(
        "-q",
        "--quality",
        type=int,
        default=QUALITY,
        help="Quality (0-100 for images)",
    )
    parser.add_argument(
        "-t",
        "--type",
        type=str,
        default="image",
        help="Type of asset to compress (image or video)",
    )

    args: argparse.Namespace = parser.parse_args()

    if args.type == "image":
        image(args.path, args.quality)
    elif args.type == "video":
        video(args.path, args.quality)
    else:
        raise ValueError(f"Error: Unsupported file type '{args.type}'. Supported types are: image or video.")
"""
Script to compress images and videos.
"""

import argparse
import math
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Final, Optional

import PIL

# --- Constants ---
IMAGE_QUALITY: Final[int] = 56
VIDEO_QUALITY: Final[int] = 28  # HEVC default CRF
WEBM_QUALITY: Final[int] = 31  # VP9 default CRF
DEFAULT_GIF_FRAMERATE: Final[int] = 10

ALLOWED_IMAGE_EXTENSIONS: Final[set[str]] = {".jpg", ".jpeg", ".png"}
ALLOWED_VIDEO_EXTENSIONS: Final[set[str]] = {
    ".gif",
    ".mov",
    ".mp4",
    ".webm",
    ".avi",
    ".mpeg",
}
ALLOWED_EXTENSIONS: Final[set[str]] = (
    ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS
)

# FFmpeg Codecs and Formats
CODEC_HEVC: Final[str] = "libx265"
CODEC_VP9: Final[str] = "libvpx-vp9"
CODEC_AUDIO_OPUS: Final[str] = "libopus"
PIXEL_FORMAT_YUV420P: Final[str] = "yuv420p"
TAG_APPLE_COMPATIBILITY: Final[str] = "hvc1"

# FFmpeg Arguments
_FFMPEG_COMMON_OUTPUT_ARGS: Final[list[str]] = [
    "-movflags",
    "+faststart",
    "-y",
    "-v",
    "error",
]
_FFMPEG_VP9_QUALITY_ARGS: Final[list[str]] = [
    "-deadline",
    "good",
    "-cpu-used",
    "4",
    "-row-mt",
    "1",
    "-auto-alt-ref",
    "1",
]


def _check_dependencies() -> None:
    """
    Check if required command-line tools are installed.
    """
    required_tools = ["ffmpeg", "ffprobe", "magick"]
    missing_tools = [
        tool for tool in required_tools if shutil.which(tool) is None
    ]
    if missing_tools:
        raise RuntimeError(
            f"Error: Missing required tools: {', '.join(missing_tools)}. "
            "Please install them (e.g. using brew install ffmpeg imagemagick)."
        )


def image(image_path: Path, quality: int = IMAGE_QUALITY) -> None:
    """
    Converts an image to AVIF format using ImageMagick.

    Args:
        `image_path`: The path to the image file.
        `quality`: The AVIF quality (0-100). Lower quality means smaller file size.
    """
    if not image_path.is_file():
        raise FileNotFoundError(f"Error: File '{image_path}' not found.")
    if image_path.suffix.lower() not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError(f"Error: Unsupported file type '{image_path.suffix}'.")

    avif_path: Path = image_path.with_suffix(".avif")
    if avif_path.exists():
        print(
            f"AVIF file '{avif_path.name}' already exists. Skipping conversion.",
            file=sys.stderr,
        )
        return

    try:
        command: list[str | Path] = [
            "magick",
            image_path,
            "-quality",
            str(quality),
            "-strip",  # Removes metadata that might block serving
            "-colorspace",
            "sRGB",
            "-define",
            "heic:preserve-color-profile=true",
            str(avif_path),
        ]
        subprocess.run(command, check=True, capture_output=True)
        print(f"Successfully converted {image_path.name} to {avif_path.name}")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(
            f"Error during AVIF conversion of {image_path.name}: {e}"
        ) from e


def to_video(
    video_path: Path,
    quality_hevc: int = VIDEO_QUALITY,
    quality_webm: int = WEBM_QUALITY,
) -> None:
    """
    Converts a video to both mp4 (HEVC) and webm (VP9) formats using ffmpeg,
    unless the output files already exist.

    Handles GIF and other video types.
    """
    if not video_path.is_file():
        raise FileNotFoundError(f"Error: Input file '{video_path}' not found.")

    if video_path.suffix.lower() not in ALLOWED_VIDEO_EXTENSIONS:
        raise ValueError(
            f"Error: Unsupported file type '{video_path.suffix}'. "
            f"Supported types are: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}."
        )

    if video_path.suffix.lower() == ".gif":
        _convert_gif(video_path, quality_hevc, quality_webm)
    else:
        _to_hevc_video(video_path, quality_hevc)
        _to_webm_video(video_path, quality_webm)


def _ensure_even_dimensions_ffmpeg_filter() -> str:
    """
    Returns ffmpeg filter string to ensure even dimensions.
    """
    return "scale=trunc(iw/2)*2:trunc(ih/2)*2"


_hevc_audio_args: Final[list[str]] = [
    "-map",
    "0:v:0",
    "-map",
    "0:a?",
    "-c:a",
    "copy",
]


def _run_ffmpeg_hevc(
    input_spec: str,
    output_path: Path,
    quality: int,
    framerate: Optional[int] = None,
    is_gif: bool = False,
) -> None:
    """
    Helper function to run the ffmpeg command for HEVC/MP4 conversion.
    """
    ffmpeg_cmd: list[str] = [
        "ffmpeg",
        # Input specification
        *(["-framerate", str(framerate)] if framerate else []),
        "-i",
        input_spec,
        # Video settings
        "-c:v",
        CODEC_HEVC,
        "-crf",
        str(quality),
        "-x265-params",
        "log-level=warning",  # Keep logging minimal for x265
        # "-preset",
        # "slower",
        # "-vf",
        # _ensure_even_dimensions_ffmpeg_filter(),
        "-pix_fmt",
        PIXEL_FORMAT_YUV420P,
        "-tag:v",
        TAG_APPLE_COMPATIBILITY,
        *(["-an"] if is_gif else _hevc_audio_args),  # No audio for GIF output
        *(["-loop", "0"] if is_gif else []),
        *_FFMPEG_COMMON_OUTPUT_ARGS,
        str(output_path),
    ]

    try:
        subprocess.run(
            ffmpeg_cmd,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        print(
            f"Successfully converted {'GIF frames' if is_gif else input_spec} to {output_path.name}"
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(
            f"Error during HEVC conversion to {output_path.name}: {e.stderr}\n"
            f"Command: {' '.join(ffmpeg_cmd)}"
        ) from e


_webm_audio_args: Final[list[str]] = [
    "-map",
    "0:v:0",
    "-map",
    "0:a?",
    "-c:a",
    CODEC_AUDIO_OPUS,
    "-b:a",
    "128k",
]


def _run_ffmpeg_webm(
    input_spec: str,
    output_path: Path,
    quality: int,
    framerate: Optional[int] = None,
    is_gif: bool = False,
) -> None:
    """
    Helper function to run the ffmpeg command for WebM/VP9 conversion.
    """

    # Base command arguments (used for pass 2 or single pass)
    base_cmd: list[str] = [
        "ffmpeg",
        *(["-framerate", str(framerate)] if framerate else []),
        "-i",
        input_spec,
        "-c:v",
        CODEC_VP9,
        "-crf",
        str(quality),
        "-b:v",
        "0",
        "-vf",
        _ensure_even_dimensions_ffmpeg_filter(),
        "-pix_fmt",
        PIXEL_FORMAT_YUV420P,
        *_FFMPEG_VP9_QUALITY_ARGS,
        *(["-an"] if is_gif else _webm_audio_args),
        *(["-loop", "0"] if is_gif else []),
    ]

    full_cmd_log: list[str] = []  # For logging full command sequence if error

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            log_file_base: Path = (
                Path(temp_dir) / f"ffmpeg2pass-{output_path.stem}"
            )
            log_file_base_str: str = str(log_file_base)

            # First pass command (only video, minimal args)
            pass1_input: str = str(input_spec)  # Ensure path is string
            pass1_cmd: list[str] = [
                "ffmpeg",
                "-i",
                pass1_input,
                "-map",
                "0:v:0",
                "-c:v",
                CODEC_VP9,
                "-crf",
                str(quality),
                "-b:v",
                "0",
                "-vf",
                _ensure_even_dimensions_ffmpeg_filter(),
                "-pix_fmt",
                PIXEL_FORMAT_YUV420P,
                *_FFMPEG_VP9_QUALITY_ARGS,
                "-pass",
                "1",
                "-passlogfile",
                log_file_base_str,
                "-an",
                *(_FFMPEG_COMMON_OUTPUT_ARGS + [str(output_path)]),
            ]
            full_cmd_log = pass1_cmd[:]  # Copy
            subprocess.run(pass1_cmd, check=True, capture_output=True)

            # Second pass command (base + pass args + common output)
            pass2_cmd: list[str] = (
                base_cmd
                + [
                    "-pass",
                    "2",
                    "-passlogfile",
                    log_file_base_str,
                ]
                + _FFMPEG_COMMON_OUTPUT_ARGS
                + [str(output_path)]
            )
            full_cmd_log.extend([" && "] + pass2_cmd)  # Append second command
            subprocess.run(pass2_cmd, check=True, capture_output=True)
            print(
                f"Successfully converted {'GIF frames' if is_gif else input_spec} to {output_path.name}"
            )
    except subprocess.CalledProcessError as e:
        cmd_str: str = (
            " ".join(full_cmd_log)
            if full_cmd_log
            else "[Command sequence not available]"
        )
        raise RuntimeError(
            f"Error during WebM conversion to {output_path.name}: {e}\n"
            f"Command: {cmd_str}"
        ) from e


def _convert_gif(
    gif_path: Path,
    quality_hevc: int = VIDEO_QUALITY,
    quality_webm: int = WEBM_QUALITY,
) -> None:
    """
    Converts a GIF file to both MP4 (HEVC) and WebM (VP9) video, preserving the
    original frame rate.

    Skips conversion if outputs exist. Uses ffmpeg helper functions.
    """
    mp4_path = gif_path.with_suffix(".mp4")
    webm_path = gif_path.with_suffix(".webm")
    mp4_exists = mp4_path.exists()
    webm_exists = webm_path.exists()

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path: Path = Path(temp_dir)
        frames_pattern: Path = temp_path / "frame_%04d.png"
        frame_rate: int = DEFAULT_GIF_FRAMERATE

        if not mp4_exists or not webm_exists:
            frame_rate = _get_gif_frame_rate(gif_path)
            _extract_gif_frames(gif_path, frames_pattern, frame_rate)

        if not mp4_exists:
            _run_ffmpeg_hevc(
                input_spec=str(frames_pattern),
                output_path=mp4_path,
                quality=quality_hevc,
                framerate=frame_rate,
                is_gif=True,
            )
        if not webm_exists:
            _run_ffmpeg_webm(
                input_spec=str(frames_pattern),
                output_path=webm_path,
                quality=quality_webm,
                framerate=frame_rate,
                is_gif=True,
            )


def _get_gif_frame_rate(gif_path: Path) -> int:
    return math.floor(1000 / PIL.Image.open(gif_path).info["duration"])


def _extract_gif_frames(
    gif_path: Path, frames_pattern: Path, frame_rate: int
) -> None:
    """
    Extracts frames from GIF using ffmpeg at a specified constant frame rate.
    """
    extract_cmd: list[str] = [
        "ffmpeg",
        "-i",
        str(gif_path),
        "-vf",
        f"fps={frame_rate}",  # Set frame rate for extraction
        "-vsync",
        "cfr",  # Ensure Constant Frame Rate for output PNGs
        str(frames_pattern),
    ]
    try:
        subprocess.run(
            extract_cmd,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
    except subprocess.CalledProcessError as e:
        # Ignore common, often harmless, non-monotonous DTS warning for GIFs
        if "non-monotonous DTS" not in e.stderr:
            raise RuntimeError(
                f"Failed to extract frames: {e.stderr}\nCommand: {' '.join(extract_cmd)}"
            ) from e
        print(
            f"Warning: Non-monotonous DTS detected extracting frames from {gif_path.name}, continuing.",
            file=sys.stderr,
        )


_CMD_TO_CHECK_CODEC: tuple[str, ...] = (
    "ffprobe",
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=codec_name",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
)


def _check_if_hevc_codec(video_path: Path) -> bool:
    """
    Checks if the video is already HEVC encoded.
    """
    args: tuple[str, ...] = _CMD_TO_CHECK_CODEC + (str(video_path),)
    codec: str = subprocess.check_output(
        args, universal_newlines=True, stderr=subprocess.PIPE
    ).strip()
    return codec == "hevc"


def _to_hevc_video(video_path: Path, quality: int = VIDEO_QUALITY) -> None:
    """
    Converts a non-GIF video to HEVC MP4.

    Skips if output exists or input is already HEVC. Uses ffmpeg helper
    function.
    """
    output_path = video_path.with_suffix(".mp4")

    if not video_path.is_file():
        raise FileNotFoundError(f"Error: Input file '{video_path}' not found.")

    if video_path.suffix.lower() == ".mp4" and _check_if_hevc_codec(video_path):
        print(
            f"Input {video_path.name} is already HEVC MP4. Skipping conversion.",
            file=sys.stderr,
        )
        return

    _run_ffmpeg_hevc(
        input_spec=str(video_path),
        output_path=output_path,
        quality=quality,
        is_gif=False,
    )


def _to_webm_video(video_path: Path, quality: int = WEBM_QUALITY) -> None:
    """
    Converts a non-GIF video to WebM/VP9 (two-pass).

    Skips if output exists. Uses ffmpeg helper function.
    """
    if not (0 <= quality <= 63):
        raise ValueError(
            f"WebM quality (CRF) must be between 0 and 63, got {quality}."
        )

    output_path: Path = video_path.with_suffix(".webm")
    if output_path.exists():
        print(
            f"WEBM already exists at {output_path=}; skipping conversion.",
            file=sys.stderr,
        )

    _run_ffmpeg_webm(
        input_spec=str(video_path),
        output_path=output_path,
        quality=quality,
        is_gif=False,
    )


def _parse_args() -> argparse.Namespace:
    """
    Parse command-line arguments.
    """
    parser: argparse.ArgumentParser = argparse.ArgumentParser(
        description="Compress assets: image to AVIF, video to MP4/HEVC and WebM/VP9."
    )
    parser.add_argument("path", type=Path, help="Path to the file to compress.")
    parser.add_argument(
        "--quality-img",
        type=int,
        default=IMAGE_QUALITY,
        help=f"Quality for image (AVIF) (0-100, lower means smaller file). Default: {IMAGE_QUALITY}",
    )
    parser.add_argument(
        "--quality-hevc",
        type=int,
        default=VIDEO_QUALITY,
        help=f"Quality for video (HEVC CRF) (0-51, lower is better quality). Default: {VIDEO_QUALITY}",
        choices=list(range(0, 52)),
    )
    parser.add_argument(
        "--quality-webm",
        type=int,
        default=WEBM_QUALITY,
        help=f"Quality for video (WebM CRF) (0-63, lower is better quality). Default: {WEBM_QUALITY}",
        choices=list(range(0, 64)),
    )

    return parser.parse_args()


def main() -> None:
    """
    Main execution function.
    """
    # Check dependencies first
    _check_dependencies()

    args: argparse.Namespace = _parse_args()
    file_path: Path = args.path

    if not file_path.is_file():
        raise FileNotFoundError(f"Error: Input file '{file_path}' not found.")

    file_suffix_lower: str = file_path.suffix.lower()

    if file_suffix_lower in ALLOWED_IMAGE_EXTENSIONS:
        image(file_path, args.quality_img)
    elif file_suffix_lower in ALLOWED_VIDEO_EXTENSIONS:
        to_video(file_path, args.quality_hevc, args.quality_webm)
    else:
        raise ValueError(
            f"Error: Unsupported file type '{file_path.suffix}'. "
            f"Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )


if __name__ == "__main__":
    main()

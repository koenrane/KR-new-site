import json
import re
import subprocess
import sys
from io import StringIO
from pathlib import Path
from typing import Any

import PIL
import pytest

from .. import compress
from . import utils

# --- Image Tests ---


@pytest.mark.parametrize("image_ext", compress.ALLOWED_IMAGE_EXTENSIONS)
def test_avif_file_size_reduction(temp_dir: Path, image_ext: str) -> None:
    """
    Assert that AVIF files are less than the size of originals.
    """
    input_file = temp_dir / f"test{image_ext}"
    utils.create_test_image(input_file, "100x100")
    original_size = input_file.stat().st_size

    # Convert to AVIF
    compress.image(input_file)
    avif_file = input_file.with_suffix(".avif")
    assert avif_file.exists()  # Check if AVIF file was created

    avif_size = avif_file.stat().st_size

    assert (
        avif_size < original_size
    ), f"AVIF ({avif_file}) size ({avif_size}) not less than half of original {image_ext.upper()} ({original_size} {input_file})"


def test_convert_avif_fails_with_non_existent_file(temp_dir: Path) -> None:
    input_file = temp_dir / "non_existent_file.jpg"

    with pytest.raises(FileNotFoundError):
        compress.image(input_file)


def test_convert_avif_fails_with_invalid_extension(temp_dir: Path) -> None:
    input_file = temp_dir / "fakefile.fake"
    input_file.touch()

    with pytest.raises(ValueError):
        compress.image(input_file)


def test_convert_avif_skips_if_avif_already_exists(temp_dir: Path) -> None:
    input_file: Path = temp_dir / "test.jpg"
    avif_file: Path = input_file.with_suffix(".avif")
    utils.create_test_image(input_file, "100x100")
    avif_file.touch()

    stderr_capture = StringIO()
    sys.stderr = stderr_capture

    compress.image(input_file)
    sys.stderr = sys.__stderr__

    assert "already exists. Skipping conversion" in stderr_capture.getvalue()


# --- Video Tests ---


@pytest.mark.parametrize("video_ext", compress.ALLOWED_VIDEO_EXTENSIONS)
def test_video_conversion(temp_dir: Path, video_ext: str) -> None:
    input_file: Path = temp_dir / f"test{video_ext}"
    utils.create_test_video(input_file)
    original_size: int = input_file.stat().st_size

    compress.video(input_file)

    mp4_file: Path = input_file.with_suffix(".mp4")
    assert mp4_file.exists()  # Check if MP4 file was created
    assert (
        mp4_file.stat().st_size <= original_size
    ) or video_ext == ".webm"  # Check if MP4 file is smaller

    webm_file: Path = input_file.with_suffix(".webm")
    assert webm_file.exists()  # Check if WebM file was created
    if video_ext != ".gif":  # GIF conversion handled separately for WebM size
        assert webm_file.stat().st_size < original_size


def test_to_video_fails_with_non_existent_file(temp_dir: Path) -> None:
    input_file = temp_dir / "non_existent_file.mov"

    with pytest.raises(FileNotFoundError):
        compress.video(input_file)


def test_to_video_fails_with_invalid_extension(temp_dir: Path) -> None:
    input_file = temp_dir / "fakefile.fake"
    input_file.touch()

    with pytest.raises(ValueError):
        compress.video(input_file)


def test_convert_mp4_skips_if_mp4_already_exists(temp_dir: Path) -> None:
    input_file: Path = temp_dir / "test.mp4"
    utils.create_test_video(input_file, codec="libx265")

    stderr_capture = StringIO()
    sys.stderr = stderr_capture

    compress.video(input_file)
    sys.stderr = sys.__stderr__

    assert "Skipping conversion" in stderr_capture.getvalue()


def test_convert_webm_skips_if_webm_already_exists(temp_dir: Path) -> None:
    input_file: Path = temp_dir / "test.mov"
    utils.create_test_video(input_file)
    webm_file: Path = input_file.with_suffix(".webm")
    webm_file.touch()  # Create dummy WebM file

    stderr_capture = StringIO()
    sys.stderr = stderr_capture

    # Run only the WebM part of the conversion
    compress._run_ffmpeg_webm(input_file, webm_file, compress._DEFAULT_VP9_CRF)

    sys.stderr = sys.__stderr__

    assert "already exists. Skipping conversion" in stderr_capture.getvalue()
    # Ensure the dummy file wasn't overwritten (check modification time or size if needed)
    assert webm_file.stat().st_size == 0


@pytest.mark.parametrize("quality", [-1, 64, 1000])
def test_convert_webm_invalid_quality(temp_dir: Path, quality: int) -> None:
    input_file: Path = temp_dir / "test.mov"
    utils.create_test_video(input_file)
    webm_file: Path = input_file.with_suffix(".webm")

    with pytest.raises(ValueError, match="must be between 0 and 63"):
        compress._run_ffmpeg_webm(input_file, webm_file, quality)


def test_error_probing_codec(temp_dir: Path) -> None:
    input_file: Path = temp_dir / "test.mp4"
    input_file.touch()  # Has no codec

    with pytest.raises(subprocess.CalledProcessError):
        compress.video(input_file)


def test_convert_gif(temp_dir: Path) -> None:
    """
    Test that a GIF file is successfully converted to MP4.
    """
    # Create a test GIF file
    input_file = temp_dir / "test.gif"
    utils.create_test_gif(input_file, duration=1, size=(100, 100))

    # Compress the GIF
    compress.video(input_file)

    # Check if MP4 file was created
    output_file = input_file.with_suffix(".mp4")
    assert output_file.exists(), f"MP4 file {output_file} was not created"

    # Check if the output file is a valid MP4 with HEVC encoding
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=codec_name",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(output_file),
            ],
            capture_output=True,
            text=True,
            check=True,
        )

        assert (
            result.stdout.strip() == "hevc"
        ), f"Output video codec is not HEVC, got: {result.stdout.strip()}"
    except subprocess.CalledProcessError as e:
        pytest.fail(f"Error checking MP4 file: {e.stderr}")

    # Check if WEBM file was created
    webm_file: Path = input_file.with_suffix(".webm")
    assert webm_file.exists(), f"WebM file {webm_file} was not created"

    # Check if temporary PNG files were cleaned up
    png_files = list(temp_dir.glob(f"{input_file.stem}_*.png"))
    assert (
        len(png_files) == 0
    ), f"Temporary PNG files were not cleaned up: {png_files}"


def test_convert_gif_preserves_frame_rate(temp_dir: Path) -> None:
    """
    Test that GIF compression preserves the detected frame rate.
    """
    # Create a test GIF file
    input_file = temp_dir / "test_framerate.gif"
    utils.create_test_gif(input_file, duration=1, size=(100, 100), fps=15)

    compress._convert_gif(input_file)

    # Check if MP4 file was created
    output_file = input_file.with_suffix(".mp4")
    assert output_file.exists(), f"MP4 file {output_file} was not created"

    # Get frame rates for both input and output files
    def get_frame_rate(file_path):
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_streams",
                str(file_path),
            ],
            capture_output=True,
            text=True,
            check=True,
        )

        probe_data = json.loads(result.stdout)
        for stream in probe_data.get("streams", []):
            if stream.get("codec_type") == "video":
                avg_frame_rate = stream.get("avg_frame_rate", "0/0")
                num, den = map(int, avg_frame_rate.split("/"))
                return num / den if den != 0 else 0
        return 0

    input_fps = get_frame_rate(input_file)
    output_fps = get_frame_rate(output_file)

    # Compare frame rates
    relative_error = abs(output_fps - input_fps) / input_fps
    assert (
        relative_error < 0.05
    ), f"Output frame rate ({output_fps}) differs significantly from input frame rate ({input_fps}). Relative error: {relative_error:.2%}"


def test_avif_preserves_color_profile(temp_dir: Path) -> None:
    """Test that AVIF conversion preserves sRGB color profile."""
    input_file = temp_dir / "test.png"
    utils.create_test_image(input_file, "100x100", colorspace="sRGB")

    compress.image(input_file)
    avif_file = input_file.with_suffix(".avif")

    # Check color profile using ImageMagick
    result = subprocess.run(
        ["/opt/homebrew/bin/magick", "identify", "-verbose", str(avif_file)],
        capture_output=True,
        text=True,
        check=True,
    )

    assert (
        "Colorspace: sRGB" in result.stdout
    ), "AVIF file should have sRGB colorspace"


def test_avif_preserves_transparency(temp_dir: Path) -> None:
    """Test that AVIF conversion preserves transparency."""
    input_file = temp_dir / "test.png"

    # Create a test image with transparency
    utils.create_test_image(
        input_file,
        "100x100",
        background="none",  # Creates transparent background
        draw="circle 50,50 20,20",  # Draws a circle
    )

    # Check that the image is transparent
    pre_result = subprocess.run(
        ["/opt/homebrew/bin/magick", "identify", "-verbose", str(input_file)],
        capture_output=True,
        text=True,
        check=True,
    )
    assert (
        "Alpha: 8-bit" in pre_result.stdout
    ), "Input PNG file should have transparency before conversion"

    compress.image(input_file)
    avif_file = input_file.with_suffix(".avif")

    # Check for alpha channel using ImageMagick
    post_result = subprocess.run(
        ["/opt/homebrew/bin/magick", "identify", "-verbose", str(avif_file)],
        capture_output=True,
        text=True,
        check=True,
    )

    assert (
        "Alpha: 8-bit" in post_result.stdout
    ), "AVIF file should preserve transparency"


def test_avif_quality_affects_file_size(temp_dir: Path) -> None:
    """Test that different quality settings produce different file sizes."""
    input_file = temp_dir / "test.png"
    utils.create_test_image(input_file, "100x100")

    # Convert with high quality
    compress.image(input_file, quality=80)
    high_quality_size = input_file.with_suffix(".avif").stat().st_size

    # Remove the first AVIF
    input_file.with_suffix(".avif").unlink()

    # Convert with low quality
    compress.image(input_file, quality=20)
    low_quality_size = input_file.with_suffix(".avif").stat().st_size

    assert (
        high_quality_size > low_quality_size
    ), "Higher quality setting should produce larger file size"


def test_avif_format_details(temp_dir: Path) -> None:
    """Test that AVIF conversion sets correct format details."""
    input_file = temp_dir / "test.png"
    utils.create_test_image(input_file, "100x100", colorspace="sRGB")

    compress.image(input_file)
    avif_file = input_file.with_suffix(".avif")

    # Use exiftool for consistent output
    result = subprocess.run(
        ["exiftool", str(avif_file)],
        capture_output=True,
        text=True,
        check=True,
    )

    # Check for specific format information using regex
    assert re.search(
        r"Chroma Format\s*:\s*YUV 4:2:0", result.stdout
    ), "AVIF should use YUV 4:2:0"
    assert re.search(
        r"Image Pixel Depth\s*:\s*8 8 8", result.stdout
    ), "AVIF should have 8-bit depth"


@pytest.mark.parametrize(
    "test_id, duration_ms, expected_fps",
    [
        ("standard", 100, 10),  # 100ms -> floor(1000/100) = 10 fps
        ("slow", 500, 2),  # 500ms -> floor(1000/500) = 2 fps
        (
            "fast",
            33,
            33,
        ),  # 33ms target -> ~30ms actual -> floor(1000/30) = 33 fps
    ],
)
def test_get_gif_frame_rate_parametrized(
    temp_dir: Path, test_id: str, duration_ms: int, expected_fps: int
) -> None:
    """Test _get_gif_frame_rate with various valid GIF durations."""
    input_file = temp_dir / f"{test_id}.gif"
    utils.create_test_gif(
        input_file,
        duration=duration_ms,
        size=(10, 10),
        fps=(round(1000 / duration_ms)),
    )
    assert compress._get_gif_frame_rate(input_file) == expected_fps


def test_get_gif_frame_rate_zero_duration(temp_dir: Path, monkeypatch) -> None:
    """Test _get_gif_frame_rate when Pillow reports zero duration."""
    input_file = temp_dir / "zero_duration.gif"
    utils.create_test_gif(
        input_file, duration=100, size=(10, 10)
    )  # Create a valid GIF first

    class MockImage:
        info: dict[str, int | None] = {"duration": 0}

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

    def mock_open(*args, **kwargs):
        return MockImage()

    monkeypatch.setattr(PIL.Image, "open", mock_open)

    # Expect a ZeroDivisionError or potentially a default value if handled
    with pytest.raises(ZeroDivisionError):
        compress._get_gif_frame_rate(input_file)


def test_get_gif_frame_rate_missing_duration(
    temp_dir: Path, monkeypatch
) -> None:
    """Test _get_gif_frame_rate when duration info is missing."""
    input_file = temp_dir / "missing_duration.gif"
    utils.create_test_gif(
        input_file, duration=100, size=(10, 10)
    )  # Create a valid GIF first

    class MockImage:
        info: dict[str, int | None] = {}  # Missing 'duration'

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

    def mock_open(*args, **kwargs):
        return MockImage()

    monkeypatch.setattr(PIL.Image, "open", mock_open)

    with pytest.raises(KeyError):
        compress._get_gif_frame_rate(input_file)


# --- _check_if_hevc_codec Tests ---


@pytest.mark.parametrize(
    "test_id, mock_output, expected_result",
    [
        ("is_hevc", "hevc\n", True),
        ("is_h264", "h264\n", False),
        ("is_vp9", "vp9\n", False),
        ("empty_output", "", False),
        ("whitespace_output", " \n ", False),
    ],
)
def test_check_if_hevc_codec(
    temp_dir: Path,
    monkeypatch,
    test_id: str,
    mock_output: str,
    expected_result: bool,
) -> None:
    """Test _check_if_hevc_codec with various ffprobe outputs."""
    input_file = temp_dir / f"test_{test_id}.mp4"
    input_file.touch()

    def mock_check_output(*args: Any, **kwargs: Any) -> str:
        return mock_output

    monkeypatch.setattr(subprocess, "check_output", mock_check_output)
    assert compress._check_if_hevc_codec(input_file) is expected_result


def test_check_if_hevc_codec_ffprobe_error(temp_dir: Path, monkeypatch) -> None:
    """Test _check_if_hevc_codec raises error on ffprobe failure."""
    input_file = temp_dir / "test_error.mp4"
    input_file.touch()

    def mock_check_output(*args: Any, **kwargs: Any) -> None:
        raise subprocess.CalledProcessError(
            cmd=list(args[0]), returncode=1, stderr="ffprobe error"
        )

    monkeypatch.setattr(subprocess, "check_output", mock_check_output)
    with pytest.raises(subprocess.CalledProcessError):
        compress._check_if_hevc_codec(input_file)

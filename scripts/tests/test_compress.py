from .. import compress
import pytest
from pathlib import Path
from . import utils
import sys
from io import StringIO

# --- Image Tests ---


@pytest.mark.parametrize("image_ext", compress.ALLOWED_IMAGE_EXTENSIONS)
def test_avif_file_size_reduction(temp_dir: Path, image_ext: str) -> None:
    """Assert that AVIF files are less than the size of originals."""
    input_file = temp_dir / f"test{image_ext}"
    print(input_file)
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

    assert "Skipping conversion" in stderr_capture.getvalue()


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

def test_convert_mp4_fails_with_non_existent_file(temp_dir: Path) -> None:
    input_file = temp_dir / "non_existent_file.mov"

    with pytest.raises(FileNotFoundError):
        compress.video(input_file)

def test_convert_mp4_fails_with_invalid_extension(temp_dir: Path) -> None:
    input_file = temp_dir / "fakefile.fake"
    input_file.touch()

    with pytest.raises(ValueError):
        compress.video(input_file)

def test_convert_mp4_skips_if_mp4_already_exists(temp_dir: Path) -> None:
    input_file: Path = temp_dir / "test.mp4"
    utils.create_test_video(input_file, codec="libx265")

    stdout_capture = StringIO()
    sys.stdout = stdout_capture

    compress.video(input_file)
    sys.stdout = sys.__stdout__

    assert "Skipping conversion" in stdout_capture.getvalue()

def test_error_probing_codec(temp_dir: Path) -> None:
    input_file: Path = temp_dir / "test.mp4"
    input_file.touch()

    with pytest.raises(RuntimeError):
        compress.video(input_file)
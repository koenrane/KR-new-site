from .. import convert_to_avif  # Absolute import
import subprocess
import pytest
import tempfile
from pathlib import Path
import sys
from io import StringIO

# --- Helper Functions ---


def create_test_image(path: Path, size: str) -> None:
    """Creates a test image using ImageMagick."""
    subprocess.run(["magick", "-size", size, "xc:red", str(path)])


# --- Pytest Fixtures ---


@pytest.fixture()
def temp_dir():
    """Creates a temporary directory and cleans up afterwards."""
    with tempfile.TemporaryDirectory() as dir_path:
        yield Path(dir_path)


# --- Tests ---


def test_convert_jpg_to_avif(temp_dir: Path) -> None:
    input_file = temp_dir / "test.jpg"
    create_test_image(input_file, "100x100")

    # Capture stderr for checking later
    stderr_capture = StringIO()
    sys.stderr = stderr_capture

    convert_to_avif.compress(input_file)

    avif_file = input_file.with_suffix(".avif")
    assert avif_file.exists()

    # Check if AVIF file was created
    output = subprocess.check_output(["file", avif_file]).decode()
    assert "AVIF" in output


def test_convert_png_to_avif(temp_dir: Path) -> None:
    input_file = temp_dir / "test.png"
    create_test_image(input_file, "32x32")

    stderr_capture = StringIO()
    sys.stderr = stderr_capture

    convert_to_avif.compress(input_file)

    avif_file = input_file.with_suffix(".avif")
    assert avif_file.exists()


@pytest.mark.parametrize("image_ext", ["jpg", "png", "jpeg"])
def test_avif_file_size_reduction(temp_dir: Path, image_ext: str) -> None:
    """Assert that AVIF files are less than the size of originals."""
    input_file = temp_dir / f"test.{image_ext}"
    create_test_image(input_file, "100x100")
    original_size = input_file.stat().st_size

    # Convert to AVIF
    convert_to_avif.compress(input_file)
    avif_file = input_file.with_suffix(".avif")
    assert avif_file.exists()  # Check if AVIF file was created

    avif_size = avif_file.stat().st_size

    assert (
        avif_size < original_size
    ), f"AVIF ({avif_file}) size ({avif_size}) not less than half of original {image_ext.upper()} ({original_size} {input_file})"


def test_convert_avif_fails_with_non_existent_file(temp_dir: Path) -> None:
    input_file = temp_dir / "non_existent_file.jpg"

    with pytest.raises(FileNotFoundError):
        convert_to_avif.compress(input_file)


def test_convert_avif_skips_if_avif_already_exists(temp_dir: Path) -> None:
    input_file = temp_dir / "test.jpg"
    avif_file = input_file.with_suffix(".avif")
    create_test_image(input_file, "100x100")
    avif_file.touch()

    stderr_capture = StringIO()
    sys.stderr = stderr_capture

    convert_to_avif.compress(input_file)
    sys.stderr = sys.__stderr__

    assert "Skipping conversion" in stderr_capture.getvalue()

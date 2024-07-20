import unittest.mock as mock  # Import the mock module
import pytest
from pathlib import Path
import compress
import convert_assets
from . import utils as test_utils
from .. import utils as script_utils
import subprocess


# --- Pytest Fixtures ---
@pytest.fixture(autouse=True)  # Runs before each test automatically
def setup_test_env(tmp_path):
    """Sets up a temporary Git repository and populates it with test assets."""

    # Create the required directories for testing
    for dir_name in ["quartz/static", "scripts", "content"]:
        (tmp_path / dir_name).mkdir(parents=True, exist_ok=True)

    # Create image assets for testing and add reference to markdown file
    for ext in compress.ALLOWED_IMAGE_EXTENSIONS:
        test_utils.create_test_image(
            tmp_path / "quartz/static" / f"asset{ext}", "32x32"
        )
        (tmp_path / "content" / f"{ext.lstrip('.')}.md").write_text(
            f"![](quartz/static/asset{ext})\n"
        )

    # Create video assets for testing and add references to markdown files
    for ext in compress.ALLOWED_VIDEO_EXTENSIONS:
        test_utils.create_test_video(
            tmp_path / "quartz/static" / f"asset{ext}"
        )
        with open(tmp_path / "content" / f"{ext.lstrip('.')}.md", "w") as file:
            file.write(f"![](quartz/static/asset{ext})\n")
            file.write(f"[[quartz/static/asset{ext}]]\n")
            if ext != "gif":
                file.write(
                    f'<video src="quartz/static/asset{ext}" alt="shrek"/>\n'
                )

    # Special handling for GIF file in markdown
    with open(tmp_path / "content" / "gif.md", "w") as file:
        file.write('<img src="quartz/static/asset.gif" alt="shrek">\n')

    # Create an unsupported file
    (tmp_path / "quartz/static/unsupported.txt").touch()
    # Create file outside of quartz/static
    (tmp_path / "file.png").touch()
    (tmp_path / "quartz" / "file.png").touch()

    yield tmp_path  # Return the temporary directory path


# --- Tests ---


@pytest.mark.parametrize("ext", compress.ALLOWED_IMAGE_EXTENSIONS)
def test_image_conversion(ext: str, setup_test_env):
    test_dir = Path(setup_test_env)
    asset_path: Path = test_dir / "quartz/static" / f"asset{ext}"
    avif_path: Path = asset_path.with_suffix(".avif")
    content_path = Path(setup_test_env) / "content" / f"{ext.lstrip('.')}.md"

    convert_assets.convert_asset(
        asset_path, replacement_dir=test_dir / "content"
    )

    assert avif_path.exists()  # Check if AVIF file was created

    # Check that name conversion occurred
    with open(content_path, "r") as f:
        file_content = f.read()
    assert avif_path.name in file_content
    assert asset_path.exists()


# TODO finish these
@pytest.mark.parametrize("ext", compress.ALLOWED_VIDEO_EXTENSIONS)
def test_video_conversion(ext: str, setup_test_env):
    asset_path: Path = Path(setup_test_env) / "quartz/static" / f"asset{ext}"
    webm_path: Path = asset_path.with_suffix(".webm")
    content_path: Path = (
        Path(setup_test_env) / "content" / f"{ext.lstrip('.')}.md"
    )

    convert_assets.convert_asset(
        asset_path, replacement_dir=Path(setup_test_env)
    )

    assert webm_path.exists()
    with open(content_path, "r") as f:
        file_content: str = f.read()

    if ext == ".gif":
        assert (
            '<video autoplay loop muted playsinline src="quartz/static/asset.webm" type="video/webm"><source src="quartz/static/asset.webm"></video>'
            in file_content
        )
        assert (
            '<video autoplay loop muted playsinline src="quartz/static/asset.webm" alt="shrek" type="video/webm"><source src="quartz/static/asset.webm"></video>'
            in file_content
        )
    else:
        assert (
            '<video src="quartz/static/asset.webm" type="video/webm"/>'
            in file_content
        )
        assert (
            '<video src="quartz/static/asset.webm" type="video/webm" alt="shrek"/>'
            in file_content
        )


def test_remove_original_files(setup_test_env):
    asset_path = Path(setup_test_env) / "quartz" / "static" / "asset.jpg"
    assert asset_path.exists()

    convert_assets.convert_asset(
        asset_path,
        remove_originals=True,
        replacement_dir=Path(setup_test_env),
    )
    assert not asset_path.exists()


def test_strip_metadata(setup_test_env):
    dummy_image: Path = (
        Path(setup_test_env) / "quartz/static/asset_with_exif.jpg"
    )
    test_utils.create_test_image(dummy_image, "32x32")

    # Simulate adding metadata using exiftool
    with mock.patch("subprocess.run") as mock_exiftool:
        mock_exiftool.return_value = subprocess.CompletedProcess(
            args=[], returncode=0
        )
        subprocess.run(
            [
                "exiftool",
                "-Artist=Test Artist",
                "-Copyright=Test Copyright",
                str(dummy_image),
            ]
        )

    # Convert the image to AVIF
    convert_assets.convert_asset(
        dummy_image, strip_metadata=True, replacement_dir=Path(setup_test_env)
    )

    # Read the output of exiftool on the AVIF file and assert that no EXIF data is present
    with mock.patch("subprocess.check_output") as mock_check_output:
        mock_check_output.return_value = b""  # No EXIF data should be returned
        exif_output = subprocess.check_output(
            ["exiftool", dummy_image.with_suffix(".avif")]
        )
        assert (
            "Test Artist" not in exif_output.decode()
        )  # Check for a specific tag
        assert "Test Copyright" not in exif_output.decode()


def test_ignores_unsupported_file_types(setup_test_env):
    asset_path = Path(setup_test_env) / "quartz/static/unsupported.txt"

    with pytest.raises(ValueError):
        convert_assets.convert_asset(asset_path)


def test_file_not_found(setup_test_env):
    # Create a path to a non-existent file
    non_existent_file = Path(setup_test_env) / "quartz/static/non_existent.jpg"

    # Ensure the file doesn't actually exist
    assert not non_existent_file.exists()

    # Try to convert the non-existent file and expect a FileNotFoundError
    with pytest.raises(FileNotFoundError, match="File .* not found."):
        convert_assets.convert_asset(non_existent_file)


def test_ignores_non_quartz_path(setup_test_env):
    asset_path = Path(setup_test_env) / "file.png"

    with pytest.raises(ValueError, match="quartz.*directory"):
        convert_assets.convert_asset(asset_path)


def test_ignores_non_static_path(setup_test_env):
    asset_path = Path(setup_test_env) / "quartz" / "file.png"

    with pytest.raises(ValueError, match="static.*subdirectory"):
        convert_assets.convert_asset(asset_path)


import pytest
from pathlib import Path


@pytest.mark.parametrize(
    "input_path,expected_output",
    [
        (
            "/home/user/projects/quartz/static/images/test.jpg",
            "quartz/static/images/test.jpg",
        ),
        (
            "/home/user/quartz/projects/quartz/static/css/style.css",
            "quartz/static/css/style.css",
        ),
        ("/quartz/static/js/script.js", "quartz/static/js/script.js"),
    ],
)
def test_valid_paths(input_path, expected_output):
    assert script_utils.path_relative_to_quartz(Path(input_path)) == Path(
        expected_output
    )


@pytest.mark.parametrize(
    "input_path,error_message",
    [
        (
            "/home/user/projects/other/file.txt",
            "The path must be within a 'quartz' directory.",
        ),
        (
            "/home/user/projects/quartz/other/file.txt",
            "The path must be within the 'static' subdirectory of 'quartz'.",
        ),
    ],
)
def test_invalid_paths(input_path, error_message):
    with pytest.raises(ValueError, match=error_message):
        script_utils.path_relative_to_quartz(Path(input_path))

import unittest.mock as mock  # Import the mock module
import pytest
from pathlib import Path
from .. import compress
from .. import convert_assets
from . import utils as test_utils
from .. import utils as script_utils
import subprocess
import re
import shutil
import yaml
import io

mock_r2_upload = mock.MagicMock()
mock.patch.dict("sys.modules", {"r2_upload": mock_r2_upload}).start()


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

        to_write = f"![](static/asset{ext})\n"
        to_write += f"[[static/asset{ext}]]\n"
        to_write += f'<img src="static/asset{ext}" alt="shrek"/>\n'
        markdown_file = tmp_path / "content" / f"{ext.lstrip('.')}.md"
        markdown_file.write_text(to_write)

    # Create video assets for testing and add references to markdown files
    for ext in compress.ALLOWED_VIDEO_EXTENSIONS:
        test_utils.create_test_video(tmp_path / "quartz/static" / f"asset{ext}")
        with open(tmp_path / "content" / f"{ext.lstrip('.')}.md", "a") as file:
            file.write(f"![](static/asset{ext})\n")
            file.write(f"[[static/asset{ext}]]\n")
            if ext != ".gif":
                file.write(f'<video src="static/asset{ext}" alt="shrek"/>\n')

    # Special handling for GIF file in markdown
    with open(tmp_path / "content" / "gif.md", "a") as file:
        file.write('<img src="static/asset.gif" alt="shrek">')

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

    convert_assets.convert_asset(asset_path, md_replacement_dir=test_dir / "content")

    assert avif_path.exists()  # Check if AVIF file was created

    # Check that name conversion occurred
    with open(content_path, "r") as f:
        file_content = f.read()
    assert asset_path.exists()

    target_content: str = "![](static/asset.avif)\n"
    target_content += "[[static/asset.avif]]\n"
    target_content += '<img src="static/asset.avif" alt="shrek"/>\n'
    assert file_content == target_content


@pytest.mark.parametrize("ext", compress.ALLOWED_VIDEO_EXTENSIONS)
def test_video_conversion(ext: str, setup_test_env):
    asset_path: Path = Path(setup_test_env) / "quartz/static" / f"asset{ext}"
    mp4_path: Path = asset_path.with_suffix(".mp4")
    content_path: Path = Path(setup_test_env) / "content" / f"{ext.lstrip('.')}.md"
    with open(content_path, "r") as f:
        file_content: str = f.read()

    convert_assets.convert_asset(
        asset_path, md_replacement_dir=Path(setup_test_env), remove_originals=True
    )

    assert mp4_path.exists()
    with open(content_path, "r") as f:
        file_content = f.read()

    video_tags = "autoplay loop muted playsinline " if ext == ".gif" else ""
    for alt_tag in ("", 'alt="shrek" '):  # The source-tag had an alt
        assert (
            f'<video {video_tags}src="static/asset.mp4" {alt_tag}type="video/mp4"><source src="static/asset.mp4" type="video/mp4"></video>'
            in file_content
        )


# Test that it keeps or removes source files
@pytest.mark.parametrize("remove_originals", [True, False])
def test_remove_source_files(setup_test_env, remove_originals):
    asset_path = Path(setup_test_env) / "quartz" / "static" / "asset.jpg"
    assert asset_path.exists()

    convert_assets.convert_asset(
        asset_path,
        remove_originals=remove_originals,
        md_replacement_dir=Path(setup_test_env),
    )
    assert asset_path.exists() == (not remove_originals)


def test_strip_metadata(setup_test_env):
    dummy_image: Path = Path(setup_test_env) / "quartz/static/asset_with_exif.jpg"
    test_utils.create_test_image(dummy_image, "32x32")

    # Simulate adding metadata using exiftool
    with mock.patch("subprocess.run") as mock_exiftool:
        mock_exiftool.return_value = subprocess.CompletedProcess(args=[], returncode=0)
        subprocess.run(
            [
                "exiftool",
                "-Artist=Test Artist",
                "-Copyright=Test Copyright",
                str(dummy_image),
            ],
            check=True,
        )

    # Convert the image to AVIF
    convert_assets.convert_asset(
        dummy_image,
        strip_metadata=True,
        md_replacement_dir=Path(setup_test_env),
    )

    # Read the output of exiftool on the AVIF file and assert that no EXIF data is present
    with mock.patch("subprocess.check_output") as mock_check_output:
        mock_check_output.return_value = b""  # No EXIF data should be returned
        exif_output = subprocess.check_output(
            ["exiftool", dummy_image.with_suffix(".avif")]
        )
        assert "Test Artist" not in exif_output.decode()  # Check for a specific tag
        assert "Test Copyright" not in exif_output.decode()


def test_ignores_unsupported_file_types(setup_test_env):
    asset_path = Path(setup_test_env) / "quartz/static/unsupported.txt"

    with pytest.raises(ValueError):
        convert_assets.convert_asset(
            asset_path, md_replacement_dir=Path(setup_test_env) / "content"
        )


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
        convert_assets.convert_asset(
            asset_path, md_replacement_dir=Path(setup_test_env) / "content"
        )


def test_ignores_non_static_path(setup_test_env):
    asset_path = Path(setup_test_env) / "quartz" / "file.png"

    with pytest.raises(ValueError, match="static.*subdirectory"):
        convert_assets.convert_asset(
            asset_path, md_replacement_dir=Path(setup_test_env) / "content"
        )


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


@pytest.mark.parametrize(
    "input_file, expected_source_pattern, expected_target_pattern",
    [
        (
            Path("animation.gif"),
            r"\!?\[\]\((?P<link_parens>[^\)]*)animation\.gif\)|"
            r"\!?\[\[(?P<link_brackets>[^\)]*)animation\.gif\]\]|"
            r'<img (?P<earlyTagInfo>[^>]*)src="(?P<link_tag>[^\)]*)animation\.gif"(?P<tagInfo>[^>]*)(?P<endVideoTagInfo>)/?>',
            r'<video autoplay loop muted playsinline src="\g<link_parens>\g<link_brackets>\g<link_tag>animation.mp4"\g<earlyTagInfo>\g<tagInfo> type="video/mp4"\g<endVideoTagInfo>><source src="\g<link_parens>\g<link_brackets>\g<link_tag>animation.mp4" type="video/mp4"></video>',
        ),
    ]
    + [
        (
            Path(f"video{ext}"),
            rf"\!?\[\]\((?P<link_parens>[^\)]*)video\{ext}\)|"
            rf"\!?\[\[(?P<link_brackets>[^\)]*)video\{ext}\]\]|"
            r'<video (?P<earlyTagInfo>[^>]*)src="(?P<link_tag>[^\)]*)video'
            + ext
            + '"(?P<tagInfo>[^>]*)(?:type="video/'
            + ext.lstrip(".")
            + '")?(?P<endVideoTagInfo>[^>]*(?=/))/?>',
            r'<video src="\g<link_parens>\g<link_brackets>\g<link_tag>video.mp4"\g<earlyTagInfo>\g<tagInfo> type="video/mp4"\g<endVideoTagInfo>><source src="\g<link_parens>\g<link_brackets>\g<link_tag>video.mp4" type="video/mp4"></video>',
        )
        for ext in [".webm", ".mov", ".avi", ".mp4"]
    ],
)
def test_video_patterns(
    input_file: Path, expected_source_pattern: str, expected_target_pattern: str
):
    source_pattern, target_pattern = convert_assets._video_patterns(input_file)

    assert source_pattern == expected_source_pattern
    assert target_pattern == expected_target_pattern


# Test that newlines are added after video tag when it's followed by a figure caption
import pytest


@pytest.mark.parametrize(
    "initial_content",
    [
        """
    Some content before
    
    </video>
    <br/>Figure: This is a caption
    
    Some content after
    """,
        """
    Some content before
    
    </video>
    Figure: This is a caption
    
    Some content after
    """,
    ],
)
def test_video_figure_caption_formatting(setup_test_env, initial_content):
    test_dir = Path(setup_test_env)
    content_dir = test_dir / "content"

    # Create a test markdown file with the pattern we want to change
    test_md = content_dir / "test_video_figure.md"
    test_md.write_text(initial_content)

    # Create a dummy video file
    dummy_video = test_dir / "quartz/static/test_video.mp4"
    test_utils.create_test_video(dummy_video)

    # Run the conversion
    convert_assets.convert_asset(dummy_video, md_replacement_dir=content_dir)

    # Read the content of the file after conversion
    with open(test_md, "r") as f:
        converted_content = f.read()

    # Check if the pattern has been correctly modified
    expected_pattern = r"</video>\n\nFigure: This is a caption"
    assert re.search(
        expected_pattern, converted_content
    ), f"Expected pattern not found in:\n{converted_content}"

    # Additional check to ensure there's no <br/> tag left
    assert (
        "<br/>" not in converted_content
    ), f"<br/> tag still present in:\n{converted_content}"


# --- Additional Tests for process_card_image_in_markdown ---
mock_r2_upload = mock.MagicMock()
mock.patch.dict("sys.modules", {"r2_upload": mock_r2_upload}).start()


@pytest.fixture
def mock_git_root(tmp_path):
    git_root = tmp_path / "git"
    git_root.mkdir()
    (git_root / "quartz" / "static" / "images" / "card_images").mkdir(parents=True)
    (git_root / "static" / "images" / "posts").mkdir(parents=True)
    with mock.patch("scripts.utils.get_git_root", return_value=git_root):
        yield git_root


@pytest.mark.parametrize(
    "markdown_content",
    [
        # No YAML front matter
        """
Some content without YAML front matter.
![](static/image.avif)
""",
        # YAML front matter without card_image
        """
---
title: Test Post
date: 2023-10-10
---
Content with no card_image.
""",
        # card_image does not end with .avif
        """
---
title: Test Post
date: 2023-10-10
card_image: static/image.png
---
Content with non-AVIF card_image.
""",
    ],
)
def test_process_card_image_in_markdown_skips_cases(
    setup_test_env, mock_git_root, markdown_content
):
    md_file = mock_git_root / "static" / "images" / "posts" / "test.md"
    md_file.write_text(markdown_content)

    with mock.patch("requests.get") as mock_get, mock.patch(
        "subprocess.run"
    ) as mock_subproc_run, mock.patch("shutil.move") as mock_shutil_move, mock.patch(
        "scripts.convert_assets.r2_upload.upload_and_move"
    ) as mock_r2_upload:

        convert_assets.process_card_image_in_markdown(md_file)

        # Ensure that no download was attempted
        mock_get.assert_not_called()
        # Ensure that no subprocess was run
        mock_subproc_run.assert_not_called()
        # Ensure that no file was moved
        mock_shutil_move.assert_not_called()
        # Ensure that R2 upload was not called
        mock_r2_upload.assert_not_called()

        # Markdown file should remain unchanged
        assert md_file.read_text() == markdown_content


import tempfile


def test_process_card_image_in_markdown_success(setup_test_env, mock_git_root):
    markdown_content = """---
title: Test Post
date: 2023-10-10
card_image: http://example.com/static/image.avif
---
Content with AVIF card_image.
"""

    md_file = mock_git_root / "static" / "images" / "posts" / "test.md"
    md_file.write_text(markdown_content)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)
        downloaded_avif_path = temp_dir_path / "image.avif"
        converted_png_path = temp_dir_path / "image.png"
        new_card_image_url = "http://r2.example.com/static/images/card_images/image.png"
        converted_png_path.touch()

        with mock.patch("requests.get") as mock_get, mock.patch(
            "subprocess.run"
        ) as mock_subproc_run, mock.patch(
            "shutil.move"
        ) as mock_shutil_move, mock.patch(
            "scripts.convert_assets.r2_upload.upload_and_move"
        ) as mock_r2_upload, mock.patch(
            "scripts.convert_assets.r2_upload.R2_BASE_URL", "http://r2.example.com"
        ), mock.patch(
            "scripts.convert_assets.r2_upload.R2_MEDIA_DIR",
            "turntrout/static/images/card_images",
        ), mock.patch(
            "tempfile.gettempdir", return_value=str(temp_dir_path)
        ):

            # Mock the image download response
            mock_response = mock.Mock()
            mock_response.status_code = 200
            mock_response.raw = io.BytesIO(b"fake image data")
            mock_get.return_value = mock_response

            # Mock subprocess.run for ImageMagick conversion
            mock_subproc_run.return_value = subprocess.CompletedProcess(
                args=[], returncode=0
            )

            # Mock shutil.move to simulate moving the file
            mock_shutil_move.return_value = None

            # Mock R2 upload to simulate successful upload
            mock_r2_upload.return_value = None

            convert_assets.process_card_image_in_markdown(md_file)

            # Verify that the image was downloaded
            mock_get.assert_called_once_with(
                "http://example.com/static/image.avif", stream=True
            )

            # Verify that ImageMagick was called correctly
            mock_subproc_run.assert_called_once_with(
                [
                    "magick",
                    str(downloaded_avif_path),
                    "-strip",
                    "-define",
                    "png:compression-level=9",
                    "-define",
                    "png:compression-filter=5",
                    "-define",
                    "png:compression-strategy=1",
                    "-colors",
                    "256",
                    str(converted_png_path),
                ],
                check=True,
                capture_output=True,
                text=True,
            )

            # Verify that shutil.move was called correctly
            mock_shutil_move.assert_called_once_with(
                str(converted_png_path),
                str(mock_git_root / "quartz/static/images/card_images/image.png"),
            )

            # Verify that R2 upload was called with the correct parameters
            mock_r2_upload.assert_called_once_with(
                mock_git_root / "quartz/static/images/card_images/image.png",
                verbose=True,
                replacement_dir=None,
                move_to_dir="turntrout/static/images/card_images",
            )

            # Verify that the markdown file was updated correctly
            expected_updated_content = f"""---
title: Test Post
date: 2023-10-10
card_image: {new_card_image_url}
---
Content with AVIF card_image.
"""
            assert md_file.read_text() == expected_updated_content


def test_process_card_image_in_markdown_download_failure(setup_test_env, mock_git_root):
    markdown_content = """---
title: Test Post
date: 2023-10-10
card_image: http://example.com/static/image.avif
---
Content with AVIF card_image.
"""

    md_file = mock_git_root / "static" / "images" / "posts" / "test.md"
    md_file.write_text(markdown_content)

    with mock.patch("requests.get") as mock_get, mock.patch(
        "subprocess.run"
    ) as mock_subproc_run, mock.patch("shutil.move") as mock_shutil_move, mock.patch(
        "scripts.convert_assets.r2_upload.upload_and_move"
    ) as mock_r2_upload:

        # Mock the image download response to fail
        mock_get.return_value.status_code = 404

        with pytest.raises(ValueError, match="Failed to download image"):
            convert_assets.process_card_image_in_markdown(md_file)

        # Verify that the image was attempted to be downloaded
        mock_get.assert_called_once_with(
            "http://example.com/static/image.avif", stream=True
        )

        # Ensure that no subprocess was run
        mock_subproc_run.assert_not_called()
        # Ensure that no file was moved
        mock_shutil_move.assert_not_called()
        # Ensure that R2 upload was not called
        mock_r2_upload.assert_not_called()

        # Markdown file should remain unchanged
        assert md_file.read_text() == markdown_content


def test_process_card_image_in_markdown_conversion_failure(
    setup_test_env, mock_git_root
):
    markdown_content = """---
title: Test Post
date: 2023-10-10
card_image: http://example.com/static/image.avif
---
Content with AVIF card_image.
"""

    md_file = mock_git_root / "static" / "images" / "posts" / "test.md"
    md_file.write_text(markdown_content)

    downloaded_avif_path = mock_git_root / "static" / "images" / "posts" / "image.avif"
    converted_png_path = (
        mock_git_root / "quartz" / "static" / "images" / "card_images" / "image.png"
    )

    # Create the AVIF file (this will be the file that fails to convert)
    downloaded_avif_path.parent.mkdir(parents=True, exist_ok=True)
    downloaded_avif_path.touch()

    with mock.patch("requests.get") as mock_get, mock.patch(
        "subprocess.run"
    ) as mock_subproc_run, mock.patch("shutil.move") as mock_shutil_move, mock.patch(
        "scripts.convert_assets.r2_upload.upload_and_move"
    ) as mock_r2_upload:

        # Mock the image download response
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.raw = io.BytesIO(b"fake image data")
        mock_get.return_value = mock_response

        # Mock subprocess.run to raise an error during ImageMagick conversion
        mock_subproc_run.side_effect = subprocess.CalledProcessError(
            returncode=1, cmd=["magick"], stderr="ImageMagick conversion error."
        )

        with pytest.raises(subprocess.CalledProcessError, match="magick"):
            convert_assets.process_card_image_in_markdown(md_file)

        # Verify that the image was downloaded
        mock_get.assert_called_once_with(
            "http://example.com/static/image.avif", stream=True
        )

        # Verify that ImageMagick was called
        mock_subproc_run.assert_called_once()

        # Ensure that R2 upload was not called
        mock_r2_upload.assert_not_called()

        # Ensure that the PNG file was not created due to conversion failure
        assert not converted_png_path.exists()

        # Markdown file should remain unchanged
        assert md_file.read_text() == markdown_content

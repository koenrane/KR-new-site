import re
import subprocess
import unittest.mock as mock  # Import the mock module
from pathlib import Path

import pytest

from .. import compress, convert_assets
from .. import utils as script_utils

try:
    from . import utils as test_utils

    # ruff: noqa: F401
    from .utils import setup_test_env  # Import the fixture
except ImportError:
    import utils as test_utils  # type: ignore

mock_r2_upload = mock.MagicMock()
mock.patch.dict("sys.modules", {"r2_upload": mock_r2_upload}).start()


@pytest.mark.parametrize("ext", compress.ALLOWED_IMAGE_EXTENSIONS)
def test_image_conversion(ext: str, setup_test_env):
    test_dir = Path(setup_test_env)
    asset_path: Path = test_dir / "quartz/static" / f"asset{ext}"
    avif_path: Path = asset_path.with_suffix(".avif")
    content_path = Path(setup_test_env) / "content" / f"{ext.lstrip('.')}.md"

    convert_assets.convert_asset(
        asset_path, md_references_dir=test_dir / "content"
    )

    assert avif_path.exists()  # Check if AVIF file was created

    # Check that name conversion occurred
    with open(content_path) as f:
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
    content_path: Path = (
        Path(setup_test_env) / "content" / f"{ext.lstrip('.')}.md"
    )
    with open(content_path) as f:
        file_content: str = f.read()

    convert_assets.convert_asset(
        asset_path,
        md_references_dir=Path(setup_test_env),
        remove_originals=True,
    )

    assert mp4_path.exists()
    with open(content_path) as f:
        file_content = f.read()

    video_tags = " autoplay loop muted playsinline" if ext == ".gif" else ""
    for alt_tag in ("", 'alt="shrek" '):  # The source-tag had an alt
        assert (
            f'<video{video_tags}><source src="static/asset.mp4" type="video/mp4"></video>'
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
        md_references_dir=Path(setup_test_env),
    )
    assert asset_path.exists() == (not remove_originals)


def test_strip_metadata(setup_test_env):
    image_path: Path = (
        Path(setup_test_env) / "quartz" / "static" / "asset_with_exif.jpg"
    )
    test_utils.create_test_image(image_path, "32x32")

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
                str(image_path),
            ],
            check=True,
        )

    # Convert the image to AVIF
    convert_assets.convert_asset(
        image_path,
        strip_metadata=True,
        md_references_dir=Path(setup_test_env),
    )

    # Read the output of exiftool on the AVIF file and assert that no EXIF data is present
    with mock.patch("subprocess.check_output") as mock_check_output:
        mock_check_output.return_value = b""  # No EXIF data should be returned
        exif_output = subprocess.check_output(
            ["exiftool", image_path.with_suffix(".avif")]
        )
        assert (
            "Test Artist" not in exif_output.decode()
        )  # Check for a specific tag
        assert "Test Copyright" not in exif_output.decode()


def test_ignores_unsupported_file_types(setup_test_env):
    asset_path = Path(setup_test_env) / "quartz/static/unsupported.txt"

    with pytest.raises(ValueError):
        convert_assets.convert_asset(
            asset_path, md_references_dir=Path(setup_test_env) / "content"
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
            asset_path, md_references_dir=Path(setup_test_env) / "content"
        )


def test_ignores_non_static_path(setup_test_env):
    asset_path = Path(setup_test_env) / "quartz" / "file.png"

    with pytest.raises(ValueError, match="static.*subdirectory"):
        convert_assets.convert_asset(
            asset_path, md_references_dir=Path(setup_test_env) / "content"
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
    assert script_utils.path_relative_to_quartz_parent(
        Path(input_path)
    ) == Path(expected_output)


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
        script_utils.path_relative_to_quartz_parent(Path(input_path))


asset_pattern = convert_assets.asset_staging_pattern


@pytest.mark.parametrize(
    "input_file, expected_source_pattern, expected_target_pattern",
    [
        (
            Path("animation.gif"),
            rf"\!?\[\]\({asset_pattern}(?P<link_parens>[^\)]*)animation\.gif\)|"
            rf"\!?\[\[{asset_pattern}(?P<link_brackets>[^\)]*)animation\.gif\]\]|"
            rf"<img (?P<earlyTagInfo>[^>]*)src=\"{asset_pattern}(?P<link_tag>[^\)]*)animation\.gif\"(?P<tagInfo>[^>]*(?<!/))(?P<endVideoTagInfo>)/?>",
            r'<video autoplay loop muted playsinline><source src="\g<link_parens>\g<link_brackets>\g<link_tag>animation.mp4" type="video/mp4"></video>',
        ),
    ]
    + [
        (
            Path(f"video{ext}"),
            rf"\!?\[\]\({asset_pattern}(?P<link_parens>[^\)]*)video\{ext}\)|"
            rf"\!?\[\[{asset_pattern}(?P<link_brackets>[^\)]*)video\{ext}\]\]|"
            rf"<video (?P<earlyTagInfo>[^>]*)src=\"{asset_pattern}(?P<link_tag>[^\)]*)video\{ext}\"(?P<tagInfo>[^>]*)(?:type=\"video/"
            + ext.lstrip(".")
            + r"\")?(?P<endVideoTagInfo>[^>]*(?<!/))(?:/>|></video>)",
            r'<video \g<earlyTagInfo>\g<tagInfo> \g<endVideoTagInfo>><source src="\g<link_parens>\g<link_brackets>\g<link_tag>video.mp4" type="video/mp4"></video>',
        )
        for ext in [".webm", ".mov", ".avi", ".mp4"]
    ],
)
def test_video_patterns(
    input_file: Path,
    expected_source_pattern: str,
    expected_target_pattern: str,
):
    source_pattern, target_pattern = convert_assets._video_patterns(input_file)

    assert source_pattern == expected_source_pattern
    assert target_pattern == expected_target_pattern


# Test that newlines are added after video tag when it's followed by a figure caption
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
    convert_assets.convert_asset(dummy_video, md_references_dir=content_dir)

    # Read the content of the file after conversion
    with open(test_md) as f:
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


def test_asset_staging_path_conversion(setup_test_env) -> None:
    test_dir = Path(setup_test_env)
    asset_path: Path = test_dir / "quartz/static" / "asset.jpg"
    avif_path: Path = asset_path.with_suffix(".avif")
    content_path = Path(setup_test_env) / "content" / "staging.md"

    # Create a test markdown file with asset_staging paths
    with open(content_path, "w") as f:
        f.write("![](./asset_staging/static/asset.jpg)\n")
        f.write("[[./asset_staging/static/asset.jpg]]\n")
        f.write('<img src="./asset_staging/static/asset.jpg" alt="shrek"/>\n')

    convert_assets.convert_asset(
        asset_path, md_references_dir=test_dir / "content"
    )

    # Check that the AVIF file was created
    assert avif_path.exists()

    # Verify content was properly converted
    with open(content_path) as f:
        file_content = f.read()

    expected_content = (
        "![](static/asset.avif)\n"
        "[[static/asset.avif]]\n"
        '<img src="static/asset.avif" alt="shrek"/>\n'
    )
    assert file_content == expected_content


@pytest.mark.parametrize(
    "input_content,expected_content",
    [
        (
            "![](./static/asset.jpg)",
            "![](static/asset.avif)",
        ),
        (
            "![](./asset_staging/static/asset.jpg)",
            "![](static/asset.avif)",
        ),
        (
            '<img src="./static/asset.jpg"/>',
            '<img src="static/asset.avif"/>',
        ),
        (
            '<img src="./asset_staging/static/asset.jpg"/>',
            '<img src="static/asset.avif"/>',
        ),
        (
            '<img src="/static/asset.jpg"/>',
            '<img src="static/asset.avif"/>',
        ),
    ],
)
def test_path_pattern_variations(
    setup_test_env, input_content: str, expected_content: str
) -> None:
    test_dir = Path(setup_test_env)
    asset_path: Path = test_dir / "quartz/static" / "asset.jpg"
    content_path = Path(setup_test_env) / "content" / "variations.md"

    # Create test markdown file with the test pattern
    with open(content_path, "w") as f:
        f.write(input_content)

    convert_assets.convert_asset(
        asset_path, md_references_dir=test_dir / "content"
    )

    # Verify content was properly converted
    with open(content_path) as f:
        file_content = f.read()

    assert file_content.strip() == expected_content


prefixes = ("", ".")


@pytest.mark.parametrize(
    "input_content,expected_content",
    [
        (
            f'<video src="{prefix}/asset_staging/static/video.mp4"></video>',
            '<video><source src="static/video.mp4" type="video/mp4"></video>',
        )
        for prefix in prefixes
    ]
    + [
        (
            f'<img src="{prefix}/asset_staging/static/animation.gif"/>',
            '<video autoplay loop muted playsinline><source src="static/animation.mp4" type="video/mp4"></video>',
        )
        for prefix in prefixes
    ],
)
def test_video_asset_staging_paths(
    setup_test_env, input_content: str, expected_content: str
) -> None:
    test_dir = Path(setup_test_env)
    asset_path: Path = test_dir / "quartz/static" / "video.mp4"
    gif_path: Path = test_dir / "quartz/static" / "animation.gif"

    test_utils.create_test_video(asset_path)
    test_utils.create_test_video(gif_path)
    content_path = Path(setup_test_env) / "content" / "video_paths.md"

    # Create test markdown file with the test pattern
    with open(content_path, "w") as f:
        f.write(input_content)

    # Convert the appropriate asset based on the test case
    if "animation.gif" in input_content:
        convert_assets.convert_asset(
            gif_path, md_references_dir=content_path.parent
        )
    else:
        convert_assets.convert_asset(
            asset_path, md_references_dir=content_path.parent
        )

    # Verify content was properly converted
    with open(content_path) as f:
        file_content = f.read()

    assert file_content.strip() == expected_content


@pytest.mark.parametrize(
    "input_str,expected_groups",
    [
        # Basic self-closing img tag
        (
            '<img src="./asset_staging/static/test.gif"/>',
            {
                "link_tag": "static/",
                "earlyTagInfo": "",
                "tagInfo": "",
                "endVideoTagInfo": "",
            },
        ),
        # Video tag with attributes
        (
            '<video src="static/test.mp4" alt="test"/>',
            {
                "link_tag": "static/",
                "earlyTagInfo": "",
                "tagInfo": ' alt="test"',
                "endVideoTagInfo": "",
            },
        ),
        # Video tag with attributes and no self-closing slash - shouldn't match
        (
            '<video src="static/test.mp4" alt="test">',
            None,
        ),
        # Video tag with attributes before and after src
        (
            '<video class="test" src="static/test.mp4" alt="test"/>',
            {
                "link_tag": "static/",
                "earlyTagInfo": 'class="test" ',
                "tagInfo": ' alt="test"',
                "endVideoTagInfo": "",
            },
        ),
        # Img tag with alt attribute after src
        (
            '<img src="/asset_staging/static/test.gif" alt="test"/>',
            {
                "link_tag": "static/",
                "earlyTagInfo": "",
                "tagInfo": ' alt="test"',
                "endVideoTagInfo": "",
            },
        ),
        # Img tag with class attribute before src
        (
            '<img class="test" src="static/test.gif"/>',
            {
                "link_tag": "static/",
                "earlyTagInfo": 'class="test" ',
                "tagInfo": "",
                "endVideoTagInfo": "",
            },
        ),
        # Img tag with attributes on both sides
        (
            '<img class="before" src="static/test.gif" alt="after"/>',
            {
                "link_tag": "static/",
                "earlyTagInfo": 'class="before" ',
                "tagInfo": ' alt="after"',
                "endVideoTagInfo": "",
            },
        ),
        # Img tag with slashes in attribute values
        (
            '<img data-path="/some/path" src="static/test.gif" alt="test/with/slashes"/>',
            {
                "link_tag": "static/",
                "earlyTagInfo": 'data-path="/some/path" ',
                "tagInfo": ' alt="test/with/slashes"',
                "endVideoTagInfo": "",
            },
        ),
        # Img tag without self-closing slash
        (
            '<img src="static/test.gif">',
            {
                "link_tag": "static/",
                "earlyTagInfo": "",
                "tagInfo": "",
                "endVideoTagInfo": "",
            },
        ),
        # Markdown image syntax
        (
            "![](/asset_staging/static/test.gif)",
            {
                "link_parens": "static/",
                "link_tag": None,
                "earlyTagInfo": None,
                "tagInfo": None,
                "endVideoTagInfo": None,
            },
        ),
        # Wiki-link syntax
        (
            "[[/asset_staging/static/test.gif]]",
            {
                "link_brackets": "static/",
                "link_tag": None,
                "earlyTagInfo": None,
                "tagInfo": None,
                "endVideoTagInfo": None,
            },
        ),
    ],
)
def test_video_pattern_matching(
    input_str: str, expected_groups: dict[str, str]
):
    """Test the regex patterns for video/gif tags directly to verify matching behavior"""
    ext = ".gif" if "gif" in input_str else ".mp4"
    test_file = Path(f"test{ext}")
    pattern, _ = convert_assets._video_patterns(test_file)

    match = re.match(pattern, input_str)
    if expected_groups is None:
        assert match is None, f"Avoided matching with {input_str}"
        return
    assert match is not None, f"Pattern failed to match: {input_str}"

    # Check that each group captured exactly what we expect
    for group_name, expected_value in expected_groups.items():
        actual_value = match.group(group_name)
        assert (
            actual_value == expected_value
        ), f"For {input_str}, group {group_name} captured '{actual_value}' but expected '{expected_value}'\npattern: {pattern}"

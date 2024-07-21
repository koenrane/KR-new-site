import pytest
from unittest.mock import patch
from pathlib import Path
import subprocess
from .. import r2_upload


# Fixtures


@pytest.fixture()
def r2_cleanup():
    uploaded_files = []
    yield uploaded_files
    for file in uploaded_files:
        subprocess.run(
            ["rclone", "delete", f"r2:{r2_upload.R2_BUCKET_NAME}/{file}"],
            check=True,
        )


@pytest.fixture
def test_files(temp_dir):
    quartz_dir = temp_dir / "quartz"
    content_dir = quartz_dir / "content"
    static_dir = quartz_dir / "static"
    content_dir.mkdir(parents=True)
    static_dir.mkdir(parents=True)

    test_image = static_dir / "test.jpg"
    test_image.touch()

    md_files = [
        (
            content_dir / "test1.md",
            "Here's an image: ![](quartz/static/test.jpg)",
        ),
        (
            content_dir / "test2.md",
            "Multiple images: ![](quartz/static/test.jpg) ![](quartz/static/test.jpg)",
        ),
        (
            content_dir / "patterns.md",
            """
        Standard: ![](quartz/static/test.jpg)
        Multiple: ![](quartz/static/test.jpg) ![](quartz/static/test.jpg)
        No match: ![](quartz/static/other.jpg)
        Inline: This is an inline ![](quartz/static/test.jpg) image.
        """,
        ),
    ]

    for file_path, content in md_files:
        file_path.write_text(content)

    return test_image, content_dir, md_files


# Tests


def test_upload_to_r2_success(temp_dir, r2_cleanup):
    file_path = temp_dir / "quartz" / "static" / "test.jpg"
    file_path.parent.mkdir(parents=True)
    file_path.touch()

    r2_upload.upload_and_move(file_path, move_to_dir=temp_dir)
    r2_cleanup.append("static/test.jpg")

    assert subprocess.run(
        ["rclone", "ls", f"r2:{r2_upload.R2_BUCKET_NAME}/static/test.jpg"],
        capture_output=True,
        text=True,
    ).stdout
    assert (temp_dir / "test.jpg").exists()


@pytest.mark.parametrize(
    "input_path, expected_key",
    [
        ("/path/to/quartz/static/image.jpg", "static/image.jpg"),
        ("quartz/content/blog/post.md", "content/blog/post.md"),
        ("/quartz/assets/file.pdf", "assets/file.pdf"),
        ("no_matching_dir/file.txt", "no_matching_dir/file.txt"),
    ],
)
def test_get_r2_key(input_path, expected_key):
    assert r2_upload._get_r2_key(Path(input_path)) == expected_key


@pytest.mark.parametrize(
    "exception_class, file_path",
    [
        (FileNotFoundError, "quartz/non_existent.jpg"),
        (ValueError, "static/test.jpg"),
    ],
)
def test_upload_and_move_exceptions(temp_dir, exception_class, file_path):
    with pytest.raises(exception_class):
        r2_upload.upload_and_move(temp_dir / file_path)


@pytest.mark.parametrize(
    "mock_func, mock_side_effect, expected_exception",
    [
        (
            "subprocess.run",
            subprocess.CalledProcessError(1, "rclone"),
            RuntimeError,
        ),
        ("shutil.move", IOError("Permission denied"), IOError),
    ],
)
def test_upload_and_move_failures(
    temp_dir, mock_func, mock_side_effect, expected_exception
):
    file_path = temp_dir / "quartz" / "static" / "test_fail.jpg"
    file_path.parent.mkdir(parents=True)
    file_path.touch()

    with patch(mock_func, side_effect=mock_side_effect):
        with pytest.raises(expected_exception):
            r2_upload.upload_and_move(file_path, move_to_dir=temp_dir)


@pytest.mark.parametrize(
    "args, expected_exception",
    [
        (["-v", "-m", "/tmp", "quartz/static/test.jpg"], None),
        (
            ["non_existent_file.jpg"],
            FileNotFoundError,
        ),
        ([], SystemExit),
    ],
)
def test_main_function(temp_dir, capsys, args: list[str], expected_exception):
    if "quartz/static/test.jpg" in args:
        file_path = temp_dir / "quartz" / "static" / "test.jpg"
        file_path.parent.mkdir(parents=True)
        file_path.touch()
        args = [
            arg.replace("quartz/static/test.jpg", str(file_path))
            for arg in args
        ]
        args = ["--replacement-dir", str(temp_dir)] + args

    with patch("sys.argv", ["r2_upload.py"] + args):
        if expected_exception:
            with pytest.raises(expected_exception):
                r2_upload.main()
        else:
            r2_upload.main()


def test_verbose_output(temp_dir, capsys):
    file_path = temp_dir / "quartz" / "static" / "test_verbose.jpg"
    file_path.parent.mkdir(parents=True)
    file_path.touch()

    with patch("subprocess.run"):  # Mock subprocess.run to avoid actual upload
        r2_upload.upload_and_move(
            file_path,
            verbose=True,
            move_to_dir=temp_dir,
        )

    captured = capsys.readouterr()
    assert f"Uploading {file_path}" in captured.out
    assert "Changing" in captured.out
    assert "Moving original file" in captured.out


def test_main_function_success(test_files, capsys):
    with patch("sys.argv", ["r2_upload.py", str(test_files[0])]):
        with patch("r2_upload.upload_and_move"):  # Mock to avoid actual upload
            r2_upload.main()

    captured = capsys.readouterr()
    assert "Error" not in captured.out  # No error message should be printed


def _assert_file_uploaded(file_key):
    assert subprocess.run(
        ["rclone", "ls", f"r2:{r2_upload.R2_BUCKET_NAME}/{file_key}"],
        capture_output=True,
        text=True,
    ).stdout


def test_upload_and_move(test_files, temp_dir, r2_cleanup):
    test_image, content_dir, md_files = test_files
    move_to_dir = temp_dir / "moved"
    move_to_dir.mkdir()

    r2_upload.upload_and_move(
        test_image,
        replacement_dir=content_dir,
        move_to_dir=move_to_dir,
    )
    r2_cleanup.append("static/test.jpg")

    _assert_file_uploaded("static/test.jpg")
    assert (move_to_dir / "test.jpg").exists()
    assert not test_image.exists()

    expected_contents = [
        "Here's an image: ![](https://assets.turntrout.com/static/test.jpg)",
        "Multiple images: ![](https://assets.turntrout.com/static/test.jpg) ![](https://assets.turntrout.com/static/test.jpg)",
        """
        Standard: ![](https://assets.turntrout.com/static/test.jpg)
        Multiple: ![](https://assets.turntrout.com/static/test.jpg) ![](https://assets.turntrout.com/static/test.jpg)
        No match: ![](quartz/static/other.jpg)
        Inline: This is an inline ![](https://assets.turntrout.com/static/test.jpg) image.
        """,
    ]

    for (file_path, _), expected_content in zip(md_files, expected_contents):
        assert file_path.read_text().strip() == expected_content.strip()


def test_upload_and_move_no_replacement(test_files, temp_dir, r2_cleanup):
    test_image, _, md_files = test_files
    move_to_dir = temp_dir / "moved"
    move_to_dir.mkdir()
    empty_dir = temp_dir / "empty"
    empty_dir.mkdir()

    r2_upload.upload_and_move(
        test_image, replacement_dir=empty_dir, move_to_dir=move_to_dir
    )
    r2_cleanup.append("static/test.jpg")

    _assert_file_uploaded("static/test.jpg")
    assert (move_to_dir / "test.jpg").exists()
    assert not test_image.exists()

    for file_path, original_content in md_files:
        assert file_path.read_text().strip() == original_content.strip()

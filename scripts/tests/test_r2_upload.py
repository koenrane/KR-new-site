import pytest
from unittest.mock import patch
from pathlib import Path
import subprocess
from .. import r2_upload


@pytest.fixture()
def r2_cleanup():
    uploaded_files = []
    yield uploaded_files
    for file in uploaded_files:
        subprocess.run(
            ["rclone", "delete", f"r2:{r2_upload.R2_BUCKET_NAME}/{file}"],
            check=True,
        )


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

    with patch("sys.argv", ["r2_upload.py"] + args):
        if expected_exception:
            with pytest.raises(expected_exception):
                r2_upload.main()
        else:
            r2_upload.main()

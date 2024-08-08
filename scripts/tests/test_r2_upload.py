import pytest
from unittest.mock import patch
import shutil
from pathlib import Path
import subprocess
from .. import r2_upload


@pytest.fixture()
def r2_cleanup():
    """Fixture to clean up uploaded files on R2 after each test."""
    uploaded_files = []
    yield uploaded_files
    for file in uploaded_files:
        subprocess.run(
            ["rclone", "delete", f"r2:{r2_upload.R2_BUCKET_NAME}/{file}"],
            check=True,
        )


@pytest.fixture
def test_media_setup(tmp_path):
    """
    Fixture to set up a temporary test environment with:
        - A Quartz project structure (content, static directories).
        - Markdown files with image references.
        - Git initialization to simulate a real project.
    """
    dirs = {
        "quartz": tmp_path / "quartz",
        "content": tmp_path / "quartz" / "content",
        "static": tmp_path / "quartz" / "static",
    }
    for d in dirs.values():
        d.mkdir(parents=True, exist_ok=True)

    test_files = [
        "test.jpg",
        "file1.webm",
        "file2.svg",
        "file3.avif",
        "file4.png",
        "file5.jpg",
    ]
    for f in test_files:
        (dirs["static"] / f).touch()

    md_content = {
        "test1.md": "Here's an image: ![](quartz/static/test.jpg)",
        "test2.md": "Multiple images: ![](quartz/static/test.jpg) ![](quartz/static/test.jpg)",
        "test3.md": "Here's a path which starts with a dot: ![](./static/test.jpg)",
        "patterns.md": "Standard: ![](quartz/static/test.jpg)\nMultiple: ![](quartz/static/test.jpg) ![](quartz/static/test.jpg)\nNo match: ![](quartz/static/other.jpg)\nInline: This is an inline ![](quartz/static/test.jpg) image.",
        "test.md": "\n".join(f"![](quartz/static/{f})" for f in test_files),
    }
    md_files = [
        (dirs["content"] / f, content) for f, content in md_content.items()
    ]
    for file_path, content in md_files:
        file_path.write_text(content)

    subprocess.run(["git", "init", tmp_path], check=True)
    (tmp_path / ".gitignore").touch()

    yield tmp_path, dirs["static"] / "test.jpg", dirs["content"], md_files

    shutil.rmtree(tmp_path)


def test_upload_to_r2_success(temp_dir, r2_cleanup):
    """Test uploading a file to R2."""
    file_path = temp_dir / "quartz" / "static" / "test.jpg"
    file_path.parent.mkdir(parents=True)
    file_path.touch()
    r2_upload.upload_and_move(file_path, move_to_dir=temp_dir)
    r2_cleanup.append("static/test.jpg")
    assert subprocess.run(
        ["rclone", "ls", f"r2:{r2_upload.R2_BUCKET_NAME}/static/test.jpg"],
        capture_output=True,
        text=True,
        check=True,
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
    assert r2_upload.get_r2_key(Path(input_path)) == expected_key


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
        (["quartz/static/non_existent_file.jpg"], FileNotFoundError),
        ([], SystemExit),
    ],
)
def test_main_function(temp_dir, args, expected_exception):
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
    with patch("subprocess.run"):
        r2_upload.upload_and_move(
            file_path, verbose=True, move_to_dir=temp_dir
        )
    captured = capsys.readouterr()
    assert all(
        text in captured.out
        for text in [
            f"Uploading {file_path}",
            "Changing",
            "Moving original file",
        ]
    )


def test_upload_and_move(test_media_setup, temp_dir, r2_cleanup):
    _, test_image, content_dir, md_files = test_media_setup
    move_to_dir = temp_dir / "moved"
    move_to_dir.mkdir()
    r2_upload.upload_and_move(
        test_image, replacement_dir=content_dir, move_to_dir=move_to_dir
    )
    r2_cleanup.append("static/test.jpg")
    assert subprocess.run(
        ["rclone", "ls", f"r2:{r2_upload.R2_BUCKET_NAME}/static/test.jpg"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    assert (move_to_dir / "test.jpg").exists() and not test_image.exists()
    for (file_path, _), expected_content in zip(
        md_files,
        [
            "Here's an image: ![](https://assets.turntrout.com/static/test.jpg)",
            "Multiple images: ![](https://assets.turntrout.com/static/test.jpg) ![](https://assets.turntrout.com/static/test.jpg)",
            "Here's a path which starts with a dot: ![](https://assets.turntrout.com/static/test.jpg)",
            "Standard: ![](https://assets.turntrout.com/static/test.jpg)\nMultiple: ![](https://assets.turntrout.com/static/test.jpg) ![](https://assets.turntrout.com/static/test.jpg)\nNo match: ![](quartz/static/other.jpg)\nInline: This is an inline ![](https://assets.turntrout.com/static/test.jpg) image.",
        ],
    ):
        assert file_path.read_text().strip() == expected_content.strip()


def test_main_upload_all_custom_filetypes(test_media_setup):
    tmp_path, _, _, _ = test_media_setup

    arg_list = [
        "r2_upload.py",
        "--all-asset-dir",
        str(tmp_path / "quartz" / "static"),
        "--filetypes",
        ".png",
        ".jpg",
        "--replacement-dir",
        str(tmp_path / "quartz" / "content"),
    ]
    with patch("sys.argv", arg_list):
        r2_upload.main()
    md_content: str = (tmp_path / "quartz" / "content" / "test.md").read_text()
    for file in ("file4.png", "file5.jpg"):
        assert f"https://assets.turntrout.com/static/{file}" in md_content

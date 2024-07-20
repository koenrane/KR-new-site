import pytest
import subprocess
from pathlib import Path
from typing import Optional, Collection
from .. import utils as script_utils

# pyright: reportPrivateImportUsage = false


@pytest.mark.parametrize("git_exists", [True, False])
def test_get_git_root(
    git_exists: bool, monkeypatch: pytest.MonkeyPatch
) -> None:
    expected_output = "/path/to/git/root" if git_exists else ""
    expected_return = Path(expected_output) if git_exists else None

    def mock_subprocess_run(*args, **kwargs) -> subprocess.CompletedProcess:
        return subprocess.CompletedProcess(
            args=args,
            returncode=0 if git_exists else 1,
            stdout=expected_output,
        )

    monkeypatch.setattr(script_utils.subprocess, "run", mock_subprocess_run)
    assert script_utils.get_git_root() == expected_return


# @pytest.mark.parametrize(
#     "replacement_dir,filetypes,expected_count,git_repo",
#     [
#         (None, ("md",), 3, True),
#         (Path("/tmp"), ("txt", "py"), 2, False),
#         (None, ("jpg", "png"), 0, True),
#     ],
# )
# def test_get_files(
#     replacement_dir: Optional[Path],
#     filetypes: Collection[str],
#     expected_count: int,
#     git_repo: bool,
#     tmp_path: Path,
#     monkeypatch: pytest.MonkeyPatch,
# ) -> None:
#     def mock_get_git_root() -> Optional[Path]:
#         return tmp_path if git_repo else None

#     def mock_repo_ignored(file: Path) -> bool:
#         return "ignored" in file.name

#     monkeypatch.setattr(script_utils, "get_git_root", mock_get_git_root)
#     monkeypatch.setattr(script_utils.git.Repo, "ignored", mock_repo_ignored)

#     if replacement_dir is None:
#         replacement_dir = tmp_path / "content"
#     replacement_dir.mkdir(parents=True, exist_ok=True)

#     for ext in filetypes:
#         (replacement_dir / f"test1.{ext}").touch()
#         (replacement_dir / f"test2.{ext}").touch()
#         (replacement_dir / f"ignored.{ext}").touch()

#     files = script_utils.get_files(replacement_dir, filetypes)
#     assert len(files) == expected_count
#     assert all(file.suffix[1:] in filetypes for file in files)
#     assert all("ignored" not in file.name for file in files)


@pytest.mark.parametrize(
    "input_path,expected_output,should_raise",
    [
        (
            "/home/user/quartz/static/images/test.png",
            Path("quartz/static/images/test.png"),
            False,
        ),
        ("/home/user/projects/other/file.txt", None, True),
        ("/home/user/quartz/content/notes.md", None, True),
    ],
)
def test_path_relative_to_quartz(
    input_path: str, expected_output: Optional[Path], should_raise: bool
) -> None:
    if should_raise:
        with pytest.raises(ValueError):
            script_utils.path_relative_to_quartz(Path(input_path))
    else:
        assert (
            script_utils.path_relative_to_quartz(Path(input_path))
            == expected_output
        )


def test_git_root_is_ancestor(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(script_utils, "get_git_root", lambda: tmp_path)
    current_file_path = tmp_path / "tests" / "test_utils.py"
    current_file_path.parent.mkdir(parents=True)
    current_file_path.touch()

    git_root = script_utils.get_git_root()
    assert git_root is not None
    assert current_file_path.is_relative_to(git_root)

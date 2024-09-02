import subprocess
from pathlib import Path
import git
import os
import pytest

@pytest.fixture(scope="session")
def linkchecker_result():
    git_repo = git.Repo(os.getcwd(), search_parent_directories=True)
    git_root = git_repo.git.rev_parse("--show-toplevel")

    # Run the linkchecker script and capture its output
    result = subprocess.run(["fish", git_root + "/scripts/linkchecker.fish", 
    "--files", Path(git_root, "scripts", "tests", ".linkchecker.test.html")], 
                            capture_output=True, 
                            text=True, 
                            check=False) # Expect this to error
    return result

def test_invalid_port_error(linkchecker_result):
    assert "Linkchecker: Found invalid port error" in linkchecker_result.stderr, "Invalid port error not found in output"

    assert linkchecker_result.returncode == 1, f"Linkchecker script failed with return code {linkchecker_result.returncode}"

def test_invalid_asset_error(linkchecker_result):
    assert "Linkchecker: Found invalid asset error" in linkchecker_result.stderr, "Invalid asset error not found in output"
    assert linkchecker_result.returncode == 1, f"Linkchecker script failed with return code {linkchecker_result.returncode}"

if __name__ == "__main__":
    pytest.main([__file__])
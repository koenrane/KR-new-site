import subprocess
from pathlib import Path
import git
import os
import pytest

from .. import utils as script_utils

@pytest.fixture(scope="session")
def linkchecker_result():
    git_repo = script_utils.get_git_repo()

    # Run the linkchecker script and capture its output
    result = subprocess.run(["fish", git_root + "/scripts/linkchecker.fish", 
   Path(git_root, "scripts", "tests", ".linkchecker.test.html")], 
                            capture_output=True, 
                            text=True, 
                            check=False) # Expect this to error
    return result

def test_invalid_port_error(linkchecker_result):
    assert "Error: URL is unrecognized or has invalid syntax" in linkchecker_result.stdout, "Invalid port error not found in output"

    assert linkchecker_result.returncode == 1, f"Linkchecker script failed with return code {linkchecker_result.returncode}"

def test_invalid_asset_error(linkchecker_result):
    assert "Error: 404 Not Found" in linkchecker_result.stdout, "Invalid asset error not found in output"
    assert linkchecker_result.returncode == 1, f"Linkchecker script failed with return code {linkchecker_result.returncode}"

if __name__ == "__main__":
    pytest.main([__file__])
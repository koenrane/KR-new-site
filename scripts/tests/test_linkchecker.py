import subprocess
from pathlib import Path
import pytest

from .. import utils as script_utils

@pytest.fixture(scope="session")
def html_linkchecker_result():
    git_root = script_utils.get_git_root()

    result = subprocess.run(["fish", git_root / Path("scripts", "linkchecker.fish"), 
                             Path(git_root, "scripts", "tests", ".linkchecker.test.html")], 
                            capture_output=True, 
                            text=True, 
                            check=False)
    return result

@pytest.fixture(scope="session")
def md_linkchecker_result():
    git_root = script_utils.get_git_root()

    result = subprocess.run(["fish", git_root / Path("scripts", "md_linkchecker.fish"), 
                             Path(git_root, "scripts", "tests", ".linkchecker.test.md")], 
                            capture_output=True, 
                            text=True, 
                            check=False)
    return result

def test_invalid_port_error(html_linkchecker_result):
    assert "Error: URL is unrecognized or has invalid syntax" in html_linkchecker_result.stdout, "Invalid port error not found in output"
    assert html_linkchecker_result.returncode != 0, f"Linkchecker script should have failed"

def test_invalid_asset_error(html_linkchecker_result):
    assert "Error: 404 Not Found" in html_linkchecker_result.stdout, "Invalid asset error not found in output"
    assert html_linkchecker_result.returncode != 0, f"Linkchecker script should have failed"

def test_invalid_md_link(md_linkchecker_result):
    assert "INVALID_MD_LINK" in md_linkchecker_result.stdout, "INVALID_MD_LINK error not found in output"
    assert md_linkchecker_result.returncode != 0, f"Linkchecker script should have failed"

if __name__ == "__main__":
    pytest.main([__file__])
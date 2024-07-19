import pytest
import tempfile
from pathlib import Path


@pytest.fixture()
def temp_dir():
    """Creates a temporary directory and cleans up afterwards."""
    with tempfile.TemporaryDirectory() as dir_path:
        yield Path(dir_path)

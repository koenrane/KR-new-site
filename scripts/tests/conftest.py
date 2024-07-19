import pytest
import tempfile
from pathlib import Path


@pytest.fixture
def temp_image(tmp_path: Path):
    """Fixture to create a temporary image file."""
    image_path = tmp_path / "image.jpg"
    image_path.touch()  # Create the file
    return image_path


@pytest.fixture()
def temp_dir():
    """Creates a temporary directory and cleans up afterwards."""
    with tempfile.TemporaryDirectory() as dir_path:
        yield Path(dir_path)

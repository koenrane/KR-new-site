from pathlib import Path
import subprocess


def create_test_image(path: Path, size: str) -> None:
    """Creates a test image using ImageMagick."""
    subprocess.run(["magick", "-size", size, "xc:red", str(path)])


def create_test_video(path: Path) -> None:
    subprocess.run(
        [
            "ffmpeg",  # The command-line tool for video processing.
            "-f",
            "lavfi",  # Use the `lavfi` input format, which allows generating a test video from filters.
            "-i",
            "rgbtestsrc",  # The input is a test video source:
            #  * `rgbtestsrc`: Built-in color pattern test video generator.
            "-t",
            "1",  # Limit the duration of the test video to 1 second.
            str(path),  # Output file path for the generated video.
        ],
        stdout=subprocess.DEVNULL,  # Redirect standard output to /dev/null
        stderr=subprocess.DEVNULL,  # Redirect standard error to /dev/null
    )

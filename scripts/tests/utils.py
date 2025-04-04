import subprocess
from pathlib import Path
from typing import Optional

import numpy as np
import pytest
from PIL import Image

from .. import compress


def create_test_image(
    path: Path,
    size: str,
    *,
    colorspace: str | None = None,
    background: str | None = None,
    draw: str | None = None,
    metadata: str | None = None,
) -> None:
    """
    Creates a test image using ImageMagick.


    Args:
        path (Path): The file path where the image will be saved.
        size (str): The size of the image in ImageMagick format (e.g., "100x100").
        colorspace (str, optional): The colorspace to use (e.g., "sRGB").
        background (str, optional): The background color/type (e.g., "none" for transparency).
        draw (str, optional): ImageMagick draw commands to execute.
        metadata (str, optional): Metadata to add to the image (e.g., "Artist=Test Artist").

    Returns:
        None

    Raises:
        subprocess.CalledProcessError: If the ImageMagick command fails.
    """
    command = ["/opt/homebrew/bin/magick", "-size", size]

    if background:
        command.extend(["xc:" + background])
    else:
        command.extend(["xc:red"])

    if colorspace:
        command.extend(["-colorspace", colorspace])

    if draw:
        command.extend(["-draw", draw])

    if metadata:
        command.extend(["-set", metadata])

    command.append(str(path))

    subprocess.run(command, check=True)


def create_test_video(
    path: Path,
    codec: Optional[str] = None,
    duration: int = 1,
    fps: Optional[int] = None,
) -> None:
    """
    Creates a test video using FFmpeg with a silent audio track.
    Uses MPEG-2 with high bitrate and all I-frames for maximum inefficiency.


    Args:
        path (Path): The file path where the video will be saved.
        codec (str, optional): The video codec to use for encoding. If None, FFmpeg's default codec is used.
        duration (int): Duration of the video in seconds. Default is 1.
        fps (int, optional): Frames per second for the video. If None, defaults to 15.

    Returns:
        None

    Raises:
        subprocess.CalledProcessError: If the FFmpeg command fails.

    Note:
        The function uses FFmpeg's 'lavfi' input format to generate the test video.
        Standard output and error are suppressed to keep the console clean during test runs.
    """
    output_extension = path.suffix.lower()
    frame_rate: int = (
        fps if fps is not None else 15
    )  # Default to 15 fps if not provided
    base_command = [
        "ffmpeg",
        "-f",
        "lavfi",
        "-i",
        # Generate video
        f"testsrc=size=160x120:rate={frame_rate}:duration={duration}",
        "-f",
        "lavfi",
        "-i",
        # Generate silent audio
        f"anullsrc=channel_layout=stereo:sample_rate=44100:duration={duration}",
        # Finish encoding when the shortest input stream ends (video or audio)
        "-shortest",
        "-v",
        "error",  # Reduce noise in test output
    ]

    if output_extension == ".gif":
        # Parameters specific to GIF output - GIF does not support audio
        base_command.extend(
            [
                "-an",  # Explicitly disable audio for GIF
                "-vf",
                f"fps={frame_rate},scale=160:-1:flags=lanczos",
                "-loop",
                "0",
            ]
        )
    elif output_extension == ".webm":
        # Parameters specific to WebM output
        base_command.extend(
            [
                "-c:v",
                "libvpx-vp9",
                "-b:v",
                "1M",  # Adjust bitrate as needed
            ]
        )
    else:
        # Default parameters for other video files
        if not codec:
            codec = "mpeg2video"
        base_command.extend(
            [
                "-c:v",
                codec,
                "-b:v",
                "4000k",  # High bitrate for testing
                "-g",
                "1",  # Every frame is an I-frame
                "-qmin",
                "1",  # High quality
                "-qmax",
                "1",  # High quality
            ]
        )

    base_command.append(str(path))

    # Run the ffmpeg command
    subprocess.run(
        base_command,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True,
    )


def create_test_gif(file_path, duration=1, size=(100, 100), fps=10):
    """
    Create a test GIF file.
    """
    frames = []
    for i in range(duration * fps):
        array = np.random.rand(size[1], size[0], 3) * 255
        image = Image.fromarray(array.astype("uint8")).convert("RGB")
        frames.append(image)

    frames[0].save(
        file_path,
        save_all=True,
        append_images=frames[1:],
        duration=1000 // fps,
        loop=0,
    )


@pytest.fixture
def setup_test_env(tmp_path):
    """
    Sets up a temporary Git repository and populates it with test assets.
    """

    # Create the required directories for testing
    for dir_name in ["quartz/static", "scripts", "content"]:
        (tmp_path / dir_name).mkdir(parents=True, exist_ok=True)

    # Create image assets for testing and add reference to markdown file
    for ext in compress.ALLOWED_IMAGE_EXTENSIONS:
        create_test_image(tmp_path / "quartz/static" / f"asset{ext}", "32x32")

        to_write = f"![](static/asset{ext})\n"
        to_write += f"[[static/asset{ext}]]\n"
        to_write += f'<img src="static/asset{ext}" alt="shrek"/>\n'
        markdown_file = tmp_path / "content" / f"{ext.lstrip('.')}.md"
        markdown_file.write_text(to_write)

    # Create video assets for testing and add references to markdown files
    for ext in compress.ALLOWED_VIDEO_EXTENSIONS:
        create_test_video(tmp_path / "quartz/static" / f"asset{ext}")
        # skipcq: PTC-W6004 because this is server-side
        with open(tmp_path / "content" / f"{ext.lstrip('.')}.md", "a") as file:
            file.write(f"![](static/asset{ext})\n")
            file.write(f"[[static/asset{ext}]]\n")
            if ext != ".gif":
                file.write(f'<video src="static/asset{ext}" alt="shrek"/>\n')

    # Special handling for GIF file in markdown
    with open(tmp_path / "content" / "gif.md", "a") as file:
        file.write('<img src="static/asset.gif" alt="shrek">')

    # Create an unsupported file
    (tmp_path / "quartz/static/unsupported.txt").touch()
    # Create file outside of quartz/static
    (tmp_path / "file.png").touch()
    (tmp_path / "quartz" / "file.png").touch()

    yield tmp_path  # Return the temporary directory path

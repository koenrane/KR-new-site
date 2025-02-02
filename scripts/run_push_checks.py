#!/usr/bin/env python3
"""
Pretty-print progress bars for all pre-push checks.
"""

import glob
import signal
import socket
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import psutil
from rich.console import Console  # type: ignore
from rich.progress import Progress, SpinnerColumn, TextColumn  # type: ignore
from rich.style import Style  # type: ignore

console = Console()

# Global variables for cleanup
_server_to_cleanup: Optional[int] = None


def cleanup_handler(signum: int, frame: Optional[object]) -> None:
    """
    Signal handler to ensure proper cleanup when the script is interrupted.

    Only kills server if we created a new one.
    """
    console.print("\n[yellow]Received interrupt signal.[/yellow]")
    if _server_to_cleanup is not None:
        kill_process(_server_to_cleanup)
    sys.exit(1)


# Register signal handlers
signal.signal(signal.SIGINT, cleanup_handler)
signal.signal(signal.SIGTERM, cleanup_handler)


def is_port_in_use(port: int) -> bool:
    """
    Check if a port is in use.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) == 0


def find_quartz_process() -> Optional[int]:
    """
    Find the PID of any running quartz server.

    Returns None if no quartz process is found.
    """
    for proc in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            cmdline = proc.info.get("cmdline")
            if cmdline is not None and any(
                "quartz" in cmd.lower() for cmd in cmdline
            ):
                return proc.pid
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return None


def kill_process(pid: int) -> None:
    """
    Safely terminate a process and its children.
    """
    try:
        process = psutil.Process(pid)
        process.terminate()
        process.wait(timeout=3)
    except (psutil.NoSuchProcess, psutil.TimeoutExpired):
        try:
            process.kill()  # Force kill if still alive
        except psutil.NoSuchProcess:
            pass


def create_server(git_root_path: Path) -> int:
    """
    Create a quartz server.

    Returns the PID of the server to use.
    """
    global _server_to_cleanup

    # Use existing server if running
    if is_port_in_use(8080):
        existing_pid = find_quartz_process()
        if existing_pid:
            console.print(
                f"[green]Using existing quartz server (PID: {existing_pid})[/green]"
            )
            return existing_pid

    # Start new server
    console.print("Starting new quartz server...")
    new_server = subprocess.Popen(
        ["npx", "quartz", "build", "--serve"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=git_root_path,
        start_new_session=True,
    )
    _server_to_cleanup = new_server.pid

    # Wait for server to be available
    for i in range(40):
        if is_port_in_use(8080):
            console.print("[green]Quartz server successfully started[/green]")
            return new_server.pid
        time.sleep(1)
        console.print(f"Waiting for server to start... ({i + 1} seconds)")

    # Server failed to start
    kill_process(new_server.pid)
    raise RuntimeError("Server failed to start after 40 seconds")


@dataclass
class CheckStep:
    """
    A step in the push checks.
    """

    name: str
    command: List[str]
    shell: bool = False
    cwd: Optional[str] = None


def run_command(step: CheckStep) -> Tuple[bool, str, str]:
    """
    Run a command and return success status and output.

    Output is only captured when there's an error to reduce verbosity.
    """
    try:
        # Use shell=True for shell commands, shell=False for direct commands
        result = subprocess.run(
            step.command if not step.shell else " ".join(step.command),
            shell=step.shell,
            cwd=step.cwd,
            stdout=subprocess.DEVNULL,  # Suppress standard output
            stderr=subprocess.PIPE,  # Only capture stderr for error reporting
            text=True,
            check=True,
        )
        return True, "", ""
    except subprocess.CalledProcessError as e:
        return False, result.stdout or "", result.stderr or ""


git_root = Path(
    subprocess.check_output(
        ["git", "rev-parse", "--show-toplevel"], text=True
    ).strip()
)

script_files = glob.glob(f"{git_root}/scripts/*.py")

# Define all check steps
steps_before_server: List[CheckStep] = [
    # CheckStep(
    #     name="Typechecking Python with mypy",
    #     command=["mypy"] + script_files,
    # ),
    # CheckStep(
    #     name="ESLinting TypeScript",
    #     command=[
    #         "npx",
    #         "eslint",
    #         "--fix",
    #         git_root,
    #         "--config",
    #         f"{git_root}/eslint.config.js",
    #     ],
    # ),
    # CheckStep(
    #     name="Cleaning up SCSS",
    #     command=["npx", "stylelint", "--fix", "quartz/**/*.scss"],
    # ),
    # CheckStep(
    #     name="Linting Python",
    #     command=["pylint", git_root, "--rcfile", f"{git_root}/.pylintrc"],
    # ),
    # CheckStep(
    #     name="Spellchecking",
    #     command=["fish", f"{git_root}/scripts/spellchecker.fish"],
    #     shell=True,
    # ),
    # CheckStep(
    #     name="Checking source files",
    #     command=["python", f"{git_root}/scripts/source_file_checks.py"],
    # ),
    # CheckStep(
    #     name="Linting prose using Vale",
    #     command=["vale", f"{git_root}/content/*.md"],
    # ),
    # CheckStep(
    #     name="Running Javascript unit tests",
    #     command=["npm", "run", "test"],
    # ),
]

# Run remaining steps that depend on the server
steps_after_server = [
    CheckStep(
        name="Checking HTML files",
        command=["python", f"{git_root}/scripts/built_site_checks.py"],
    ),
    CheckStep(
        name="Integration testing using Playwright (Chrome-only)",
        command=[
            "npx",
            "playwright",
            "test",
            "--config",
            f"{git_root}/playwright.config.ts",
            "--project",
            "Desktop Chrome",
        ],
    ),
    CheckStep(
        name="Checking that links are valid",
        command=["fish", f"{git_root}/scripts/linkchecker.fish"],
        shell=True,
    ),
    CheckStep(
        name="Updating metadata on published posts",
        command=["python", f"{git_root}/scripts/update_date_on_publish.py"],
    ),
    CheckStep(
        name="Cryptographically timestamping the last commit",
        command=["sh", f"{git_root}/scripts/timestamp_last_commit.sh"],
        shell=True,
    ),
]


def run_checks(steps: List[CheckStep]) -> None:
    """
    Run a list of check steps and handle their output.
    """
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        for step in steps:
            task_id = progress.add_task(f"[cyan]{step.name}...", total=None)
            success, stdout, stderr = run_command(step)
            progress.remove_task(task_id)

            if success:
                console.print(f"[green]✓[/green] {step.name}")
            else:
                console.print(f"[red]✗[/red] {step.name}")
                console.print("\n[bold red]Error output:[/bold red]")
                if stdout:
                    console.print(stdout)
                if stderr:
                    console.print(stderr, style=Style(color="red"))
                    sys.exit(1)


def main():
    """
    Run all checks before pushing.
    """
    global _server_to_cleanup

    try:
        run_checks(steps_before_server)
        create_server(git_root)
        run_checks(steps_after_server)

        console.print("\n[green]All checks passed successfully! 🎉[/green]")

    finally:
        cleanup_handler(0, None)  # Run cleanup on normal exit too


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Pretty-print progress bars for all pre-push checks.
"""

import glob
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


def is_port_in_use(port: int) -> bool:
    """
    Check if a port is in use.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) == 0


def find_quartz_process() -> Optional[int]:
    """
    Find the PID of any running quartz server.
    """
    for proc in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            cmdline_has_quartz = any(
                "quartz" in cmd.lower() for cmd in proc.info["cmdline"]
            )
            if "cmdline" in proc.info and cmdline_has_quartz:
                return proc.pid
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return None


def suspend_process(pid: int) -> None:
    """
    Suspend a process using SIGSTOP.
    """
    try:
        process = psutil.Process(pid)
        process.suspend()
        console.print(f"[yellow]Suspended process {pid}[/yellow]")
    except psutil.NoSuchProcess:
        pass


def resume_process(pid: int) -> None:
    """
    Resume a suspended process using SIGCONT.
    """
    try:
        process = psutil.Process(pid)
        process.resume()
        console.print(f"[green]Resumed process {pid}[/green]")
    except psutil.NoSuchProcess:
        pass


def kill_process(pid: int) -> None:
    """
    Safely terminate a process.
    """
    try:
        process = psutil.Process(pid)
        process.terminate()
        process.wait(timeout=5)
    except psutil.NoSuchProcess:
        pass
    except psutil.TimeoutExpired:
        process.kill()


def manage_server(git_root_path: Path) -> Tuple[Optional[int], Optional[int]]:
    """Manage the quartz server - suspend existing instance and start a new one.

    Returns:
        Tuple of (original_server_pid, new_server_pid)
    """
    # Find and suspend existing server if running
    original_pid = find_quartz_process()
    if original_pid:
        console.print(f"Found existing quartz server (PID: {original_pid})")
        suspend_process(original_pid)

    # Start new server
    console.print("Starting new quartz server...")
    with subprocess.Popen(
        ["npx", "quartz", "build", "--serve"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=git_root_path,
    ) as new_server:
        new_pid = new_server.pid

        # Wait for server to be available
        timeout = 40
        for i in range(timeout):
            if is_port_in_use(8080):
                console.print(
                    "[green]Quartz server successfully started "
                    "on port 8080[/green]"
                )
                return original_pid, new_pid
            time.sleep(1)
            console.print(f"Waiting for server to start... ({i + 1} seconds)")

        raise RuntimeError(f"Server failed to start after {timeout} seconds")


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
    """
    try:
        # Use shell=True for shell commands, shell=False for direct commands
        result = subprocess.run(
            step.command if not step.shell else " ".join(step.command),
            shell=step.shell,
            cwd=step.cwd,
            capture_output=True,
            text=True,
            check=True,
        )
        return True, result.stdout, result.stderr
    except subprocess.CalledProcessError as e:
        return False, e.stdout or "", e.stderr or ""


git_root = subprocess.check_output(
    ["git", "rev-parse", "--show-toplevel"], text=True
).strip()

script_files = glob.glob(f"{git_root}/scripts/*.py")

# Define all check steps
steps_before_server = [
    CheckStep(
        name="Running type checks",
        command=["mypy"] + script_files,
    ),
    CheckStep(
        name="Running ESLint",
        command=[
            "npx",
            "eslint",
            "--fix",
            git_root,
            "--config",
            f"{git_root}/eslint.config.js",
        ],
    ),
    CheckStep(
        name="Running StyleLint",
        command=["npx", "stylelint", "--fix", "quartz/**/*.scss"],
    ),
    CheckStep(
        name="Running Pylint",
        command=["pylint", git_root, "--rcfile", f"{git_root}/.pylintrc"],
    ),
    CheckStep(
        name="Running spellchecker",
        command=["fish", f"{git_root}/scripts/spellchecker.fish"],
        shell=True,
    ),
    CheckStep(
        name="Running source file checks",
        command=["python", f"{git_root}/scripts/source_file_checks.py"],
    ),
    CheckStep(
        name="Running Vale checks",
        command=["vale", f"{git_root}/content/*.md"],
    ),
    CheckStep(
        name="Running npm tests",
        command=["npm", "run", "test"],
    ),
    CheckStep(
        name="Running built site checks",
        command=["python", f"{git_root}/scripts/built_site_checks.py"],
    ),
]

# Run remaining steps that depend on the server
steps_after_server = [
    CheckStep(
        name="Running visual regression tests",
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
        name="Running link checker",
        command=["fish", f"{git_root}/scripts/linkchecker.fish"],
        shell=True,
    ),
    CheckStep(
        name="Updating publish date",
        command=["python", f"{git_root}/scripts/update_date_on_publish.py"],
    ),
    CheckStep(
        name="Timestamping last commit",
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
    original_server_pid = None
    new_server_pid = None

    try:
        # Run pre-server checks
        run_checks(steps_before_server)

        # Start server management before running checks
        original_server_pid, new_server_pid = manage_server(git_root)

        # Run post-server checks
        run_checks(steps_after_server)

        console.print("\n[green]All checks passed successfully! 🎉[/green]")

    finally:
        # Cleanup: Kill the new server and resume the original one if it existed
        if new_server_pid:
            console.print("Cleaning up test server...")
            kill_process(new_server_pid)

        if original_server_pid:
            console.print("Resuming original server...")
            resume_process(original_server_pid)
            # Wait a moment to ensure the server is back up
            time.sleep(2)
            if is_port_in_use(8080):
                console.print(
                    "[green]Original server successfully resumed[/green]"
                )
            else:
                console.print(
                    "[red]Warning: Original server did not "
                    "resume properly[/red]"
                )


if __name__ == "__main__":
    main()

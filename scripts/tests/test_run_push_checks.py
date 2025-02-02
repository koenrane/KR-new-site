"""
Unit tests for run_push_checks.py
"""

import signal
from pathlib import Path
from unittest.mock import MagicMock, patch

import psutil
import pytest
from rich.style import Style

from scripts.run_push_checks import (
    CheckStep,
    cleanup_handler,
    create_server,
    find_quartz_process,
    is_port_in_use,
    kill_process,
    run_checks,
    run_command,
)


@pytest.fixture(autouse=True)
def reset_global_state():
    """Reset global state before each test"""
    import scripts.run_push_checks

    scripts.run_push_checks._server_to_cleanup = None
    yield


@pytest.fixture
def mock_process():
    """Mock psutil.Process for testing process management functions"""
    mock = MagicMock()
    mock.pid = 12345
    mock.info = {"cmdline": ["npx", "quartz", "build", "--serve"]}
    mock.terminate = MagicMock()
    mock.wait = MagicMock()
    mock.kill = MagicMock()
    return mock


@pytest.fixture
def mock_socket():
    """Mock socket for testing port checking"""
    mock = MagicMock()
    mock.connect_ex = MagicMock()
    return mock


def test_is_port_in_use(monkeypatch):
    """Test port availability checking"""
    with patch("socket.socket") as mock_socket:
        mock_sock_instance = MagicMock()
        mock_sock_instance.connect_ex.return_value = 0
        mock_socket.return_value.__enter__.return_value = mock_sock_instance
        assert is_port_in_use(8080) is True

    with patch("socket.socket") as mock_socket:
        mock_sock_instance = MagicMock()
        mock_sock_instance.connect_ex.return_value = 1
        mock_socket.return_value.__enter__.return_value = mock_sock_instance
        assert is_port_in_use(8080) is False


def test_find_quartz_process(mock_process):
    """Test finding Quartz process"""
    with patch("psutil.process_iter", return_value=[mock_process]):
        assert find_quartz_process() == 12345

    mock_process.info = {"cmdline": ["some", "other", "process"]}
    with patch("psutil.process_iter", return_value=[mock_process]):
        assert find_quartz_process() is None


def test_kill_process(mock_process):
    """Test process termination"""
    with patch("psutil.Process", return_value=mock_process):
        kill_process(12345)
        mock_process.terminate.assert_called_once()
        mock_process.wait.assert_called_once_with(timeout=3)

    mock_process.wait.side_effect = psutil.TimeoutExpired(3)
    with patch("psutil.Process", return_value=mock_process):
        kill_process(12345)
        mock_process.kill.assert_called_once()


def test_create_server():
    """Test server creation logic"""
    with (
        patch("scripts.run_push_checks.is_port_in_use") as mock_port_check,
        patch(
            "scripts.run_push_checks.find_quartz_process"
        ) as mock_find_process,
        patch("subprocess.Popen") as mock_popen,
    ):
        mock_port_check.return_value = True
        mock_find_process.return_value = 12345
        assert create_server(Path("/fake/path")) == 12345

        mock_port_check.side_effect = [False] + [True] * 39
        mock_popen.return_value.pid = 54321
        assert create_server(Path("/fake/path")) == 54321


@pytest.fixture
def mock_command_setup():
    """Fixture for command execution test setup"""
    test_step = CheckStep(
        name="Test Command",
        command=["echo", "test"],
    )

    mock_stdout = MagicMock()
    mock_stderr = MagicMock()
    mock_process = MagicMock()
    mock_process.stdout = mock_stdout
    mock_process.stderr = mock_stderr

    mock_progress = MagicMock()
    mock_task_id = MagicMock()

    return test_step, mock_process, mock_progress, mock_task_id


def test_run_command_success(mock_command_setup):
    """Test successful command execution"""
    test_step, mock_process, mock_progress, mock_task_id = mock_command_setup

    with patch("subprocess.Popen", return_value=mock_process):
        # Set up success case
        mock_process.wait.return_value = 0
        mock_process.stdout.readline.side_effect = iter(["test output\n", ""])
        mock_process.stderr.readline.side_effect = iter([""])

        success, stdout, stderr = run_command(
            test_step, mock_progress, mock_task_id
        )

        assert success is True
        assert "test output\n" in stdout
        assert stderr == ""
        mock_progress.update.assert_called()


def test_run_command_failure(mock_command_setup):
    """Test command execution failure"""
    test_step, mock_process, mock_progress, mock_task_id = mock_command_setup

    with patch("subprocess.Popen", return_value=mock_process):
        # Set up failure case
        mock_process.wait.return_value = 1
        mock_process.stdout.readline.side_effect = iter(["error output\n", ""])
        mock_process.stderr.readline.side_effect = iter(["error message\n", ""])

        success, stdout, stderr = run_command(
            test_step, mock_progress, mock_task_id
        )

        assert success is False
        assert "error output\n" in stdout
        assert "error message\n" in stderr
        mock_progress.update.assert_called()


def test_run_command_shell_handling(mock_command_setup):
    """Test command execution with shell=True"""
    test_step, mock_process, mock_progress, mock_task_id = mock_command_setup
    test_step.shell = True

    with patch("subprocess.Popen", return_value=mock_process) as mock_popen:
        mock_process.wait.return_value = 0
        mock_process.stdout.readline.side_effect = iter(["output\n", ""])
        mock_process.stderr.readline.side_effect = iter([""])

        run_command(test_step, mock_progress, mock_task_id)

        # Verify shell command was joined
        call_args = mock_popen.call_args[0][0]
        assert isinstance(call_args, str)
        assert " ".join(test_step.command) == call_args


def test_cleanup_handler():
    """Test cleanup handler functionality"""
    with (
        patch("scripts.run_push_checks.kill_process") as mock_kill,
        patch("sys.exit") as mock_exit,
    ):
        cleanup_handler(signal.SIGINT, None)
        mock_kill.assert_not_called()
        mock_exit.assert_called_once_with(1)

        mock_kill.reset_mock()
        mock_exit.reset_mock()
        import scripts.run_push_checks

        scripts.run_push_checks._server_to_cleanup = 12345
        cleanup_handler(signal.SIGINT, None)
        mock_kill.assert_called_once_with(12345)
        mock_exit.assert_called_once_with(1)


@pytest.fixture
def test_steps():
    """Fixture providing test check steps"""
    return [
        CheckStep(name="Test Step 1", command=["echo", "test1"]),
        CheckStep(name="Test Step 2", command=["echo", "test2"]),
        CheckStep(name="Test Step 3", command=["echo", "test3"]),
    ]


def test_run_checks_all_success(test_steps):
    """Test that all checks run successfully when there are no failures"""
    with patch("scripts.run_push_checks.run_command") as mock_run:
        mock_run.return_value = (True, "", "")
        run_checks(test_steps)
        assert mock_run.call_count == 3


@pytest.mark.parametrize("failing_step_index", [0, 1, 2])
def test_run_checks_exits_on_failure(test_steps, failing_step_index):
    """Test that run_checks exits immediately when a check fails"""
    with patch("scripts.run_push_checks.run_command") as mock_run:
        # Create a list of results where one step fails
        results = [(True, "", "")] * len(test_steps)
        results[failing_step_index] = (False, "Failed output", "Error")
        mock_run.side_effect = results

        with pytest.raises(SystemExit) as exc_info:
            run_checks(test_steps)

        assert exc_info.value.code == 1  # Verify exit code is 1
        assert (
            mock_run.call_count == failing_step_index + 1
        )  # Verify it stopped at failure


def test_run_checks_shows_error_output(test_steps):
    """Test that error output is properly displayed on failure"""
    with (
        patch("scripts.run_push_checks.run_command") as mock_run,
        patch("scripts.run_push_checks.console.print") as mock_print,
    ):
        mock_run.return_value = (False, "stdout error", "stderr error")

        with pytest.raises(SystemExit):
            run_checks(test_steps)

        # Verify error output was printed
        mock_print.assert_any_call("[red]✗[/red] Test Step 1")
        mock_print.assert_any_call("\n[bold red]Error output:[/bold red]")
        mock_print.assert_any_call("stdout error")
        mock_print.assert_any_call("stderr error", style=Style(color="red"))

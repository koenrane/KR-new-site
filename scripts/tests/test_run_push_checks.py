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
    ServerManager,
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
    with patch("socket.socket") as mock_socket_cls:
        mock_sock_instance = MagicMock()
        mock_sock_instance.connect_ex.return_value = 0
        mock_socket_cls.return_value.__enter__.return_value = mock_sock_instance
        assert is_port_in_use(8080) is True

    with patch("socket.socket") as mock_socket_cls:
        mock_sock_instance = MagicMock()
        mock_sock_instance.connect_ex.return_value = 1
        mock_socket_cls.return_value.__enter__.return_value = mock_sock_instance
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
        # Case 1: The port is in use, so we find an existing process
        mock_port_check.return_value = True
        mock_find_process.return_value = 12345
        assert create_server(Path("/fake/path")) == 12345

        # Case 2: The port isn't in use initially, but comes up after we start the server
        mock_port_check.side_effect = [False] + [True] * 39

        # We must ensure we set up the context-manager return value properly
        mock_server_instance = mock_popen.return_value.__enter__.return_value
        mock_server_instance.pid = 54321

        assert create_server(Path("/fake/path")) == 54321


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

        assert exc_info.value.code == 1
        assert mock_run.call_count == failing_step_index + 1


def test_run_checks_shows_error_output(test_steps):
    """Test that error output is properly displayed on failure"""
    with (
        patch("scripts.run_push_checks.run_command") as mock_run,
        patch("scripts.run_push_checks.console.print") as mock_print,
    ):
        mock_run.return_value = (False, "stdout error", "stderr error")

        with pytest.raises(SystemExit):
            run_checks(test_steps)

        mock_print.assert_any_call("[red]✗[/red] Test Step 1")
        mock_print.assert_any_call("\n[bold red]Error output:[/bold red]")
        mock_print.assert_any_call("stdout error")
        mock_print.assert_any_call("stderr error", style=Style(color="red"))


def test_cleanup_handler():
    """Test cleanup handler functionality"""
    server_manager = ServerManager()
    with (
        patch("scripts.run_push_checks.kill_process") as mock_kill,
        patch("sys.exit") as mock_exit,
    ):
        # Test cleanup with no server
        server_manager._signal_handler(signal.SIGINT, None)
        mock_kill.assert_not_called()
        mock_exit.assert_called_once_with(1)

        mock_kill.reset_mock()
        mock_exit.reset_mock()

        # Test cleanup with active server
        server_manager.set_server_pid(12345)
        server_manager._signal_handler(signal.SIGINT, None)
        mock_kill.assert_called_once_with(12345)
        mock_exit.assert_called_once_with(1)


def test_run_command_success():
    """Test successful command execution"""
    step = CheckStep(name="Test Command", command=["echo", "test"])
    with patch("subprocess.Popen") as mock_popen:
        proc = mock_popen.return_value.__enter__.return_value
        proc.wait.return_value = 0
        proc.stdout.readline.side_effect = ["test output\n", ""]
        proc.stderr.readline.side_effect = [""]

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        success, stdout, stderr = run_command(step, mock_progress, mock_task_id)
        assert success is True
        assert "test output\n" in stdout
        assert stderr == ""


def test_run_command_failure():
    """Test command execution failure"""
    step = CheckStep(name="Test Command", command=["echo", "test"])
    with patch("subprocess.Popen") as mock_popen:
        proc = mock_popen.return_value.__enter__.return_value
        proc.wait.return_value = 1
        proc.stdout.readline.side_effect = ["error output\n", ""]
        proc.stderr.readline.side_effect = ["error message\n", ""]

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        success, stdout, stderr = run_command(step, mock_progress, mock_task_id)
        assert success is False
        assert "error output\n" in stdout
        assert "error message\n" in stderr


def test_run_command_shell_handling():
    """Test command execution with shell=True"""
    step = CheckStep(name="Test Command", command=["echo", "test"], shell=True)
    with patch("subprocess.Popen") as mock_popen:
        proc = mock_popen.return_value.__enter__.return_value
        proc.wait.return_value = 0
        proc.stdout.readline.side_effect = ["output\n", ""]
        proc.stderr.readline.side_effect = [""]

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        run_command(step, mock_progress, mock_task_id)
        expected_full_command = " ".join(step.command)
        called_cmd = mock_popen.call_args[0][0]
        assert isinstance(called_cmd, str)
        assert called_cmd == expected_full_command


def test_progress_bar_updates():
    """Test that progress bar updates correctly with output"""
    step = CheckStep(name="Test Command", command=["echo", "test"])
    with patch("subprocess.Popen") as mock_popen:
        proc = mock_popen.return_value.__enter__.return_value
        proc.wait.return_value = 0
        # Simulate 6 lines of output to test the deque maxlen=5 behavior
        proc.stdout.readline.side_effect = [
            "line1\n",
            "line2\n",
            "line3\n",
            "line4\n",
            "line5\n",
            "line6\n",
            "",
        ]
        proc.stderr.readline.side_effect = [""]

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        run_command(step, mock_progress, mock_task_id)

        update_calls = mock_progress.update.call_args_list
        # First update should show first line and make visible
        assert update_calls[0][0] == (mock_task_id,)
        assert update_calls[0][1]["description"] == "line1"
        assert update_calls[0][1]["visible"] is True

        # Last update should show lines2..6
        last_desc = update_calls[-1][1]["description"]
        assert "line1" not in last_desc
        for i in range(2, 7):
            assert f"line{i}" in last_desc


def test_progress_bar_stderr_updates():
    """Test that progress bar updates correctly with stderr output"""
    step = CheckStep(name="Test Command", command=["echo", "test"])
    with patch("subprocess.Popen") as mock_popen:
        proc = mock_popen.return_value.__enter__.return_value
        proc.wait.return_value = 1
        proc.stdout.readline.side_effect = [""]
        proc.stderr.readline.side_effect = ["error1\n", "error2\n", ""]

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        run_command(step, mock_progress, mock_task_id)

        update_calls = mock_progress.update.call_args_list
        # Confirm both stderr lines appear
        descs = [c[1]["description"] for c in update_calls]
        assert any("error1" in d for d in descs)
        assert any("error2" in d for d in descs)


def test_progress_bar_mixed_output():
    """Test that progress bar handles mixed stdout/stderr correctly"""
    step = CheckStep(name="Test Command", command=["echo", "test"])
    with patch("subprocess.Popen") as mock_popen:
        proc = mock_popen.return_value.__enter__.return_value
        proc.wait.return_value = 0
        proc.stdout.readline.side_effect = ["out1\n", "out2\n", ""]
        proc.stderr.readline.side_effect = ["err1\n", "err2\n", ""]

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        run_command(step, mock_progress, mock_task_id)

        update_calls = mock_progress.update.call_args_list
        descriptions = [call[1]["description"] for call in update_calls]
        assert any("out1" in desc for desc in descriptions)
        assert any("out2" in desc for desc in descriptions)
        assert any("err1" in desc for desc in descriptions)
        assert any("err2" in desc for desc in descriptions)

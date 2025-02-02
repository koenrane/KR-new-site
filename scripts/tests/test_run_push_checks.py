"""
Unit tests for run_push_checks.py
"""

import signal
import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import psutil
import pytest

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


def test_run_command():
    """Test command execution functionality"""
    test_step = CheckStep(
        name="Test Command",
        command=["echo", "test"],
    )

    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0)
        success, stdout, stderr = run_command(test_step)
        assert success is True
        assert stdout == ""
        assert stderr == ""

    with patch("subprocess.run") as mock_run:
        mock_error = subprocess.CalledProcessError(1, [], stderr="Error")
        mock_error.stdout = "Some output"
        mock_error.stderr = "Error message"
        mock_run.side_effect = mock_error
        success, stdout, stderr = run_command(test_step)
        assert success is False
        assert stdout == "Some output"
        assert stderr == "Error message"


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


def test_run_checks():
    """Test running check steps"""
    test_steps = [
        CheckStep(name="Test Step 1", command=["echo", "test1"]),
        CheckStep(name="Test Step 2", command=["echo", "test2"]),
    ]

    with patch("scripts.run_push_checks.run_command") as mock_run:
        mock_run.return_value = (True, "", "")
        run_checks(test_steps)
        assert mock_run.call_count == 2

        mock_run.reset_mock()
        mock_run.return_value = (False, "", "Error")
        with pytest.raises(SystemExit):
            run_checks(test_steps)

"""
Unit tests for run_push_checks.py
"""

import signal
import subprocess
import tempfile
from pathlib import Path
from unittest.mock import ANY, MagicMock, call, patch

import psutil
import pytest
from rich.style import Style

from scripts import run_push_checks


@pytest.fixture(autouse=True)
def reset_global_state():
    """Reset global state before each test"""
    import scripts.run_push_checks

    scripts.run_push_checks._server_to_cleanup = None
    yield


@pytest.fixture
def state_manager():
    """Create a temporary state manager for testing"""
    with (
        tempfile.TemporaryDirectory() as temp_dir,
        patch("tempfile.gettempdir", return_value=temp_dir),
    ):
        manager = run_push_checks.StateManager()
        # Clear any existing state before tests run
        manager.clear_state()
        yield manager
        # Clean up after tests
        manager.clear_state()


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
        assert run_push_checks.is_port_in_use(8080) is True

    with patch("socket.socket") as mock_socket_cls:
        mock_sock_instance = MagicMock()
        mock_sock_instance.connect_ex.return_value = 1
        mock_socket_cls.return_value.__enter__.return_value = mock_sock_instance
        assert run_push_checks.is_port_in_use(8080) is False


def test_find_quartz_process(mock_process):
    """Test finding Quartz process"""
    with patch("psutil.process_iter", return_value=[mock_process]):
        assert run_push_checks.find_quartz_process() == 12345

    mock_process.info = {"cmdline": ["some", "other", "process"]}
    with patch("psutil.process_iter", return_value=[mock_process]):
        assert run_push_checks.find_quartz_process() is None


def test_kill_process(mock_process):
    """Test process termination"""
    with patch("psutil.Process", return_value=mock_process):
        run_push_checks.kill_process(12345)
        mock_process.terminate.assert_called_once()
        mock_process.wait.assert_called_once_with(timeout=3)

    mock_process.wait.side_effect = psutil.TimeoutExpired(3)
    with patch("psutil.Process", return_value=mock_process):
        run_push_checks.kill_process(12345)
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
        assert run_push_checks.create_server(Path("/fake/path")) == 12345

        # Case 2: The port isn't in use initially, but comes up after we start the server
        mock_port_check.side_effect = [False] + [True] * 39

        # We must ensure we set up the context-manager return value properly
        mock_server_instance = mock_popen.return_value.__enter__.return_value
        mock_server_instance.pid = 54321

        assert run_push_checks.create_server(Path("/fake/path")) == 54321


@pytest.fixture
def test_steps():
    """Fixture providing test check steps"""
    return [
        run_push_checks.CheckStep(
            name="Test Step 1", command=["echo", "test1"]
        ),
        run_push_checks.CheckStep(
            name="Test Step 2", command=["echo", "test2"]
        ),
        run_push_checks.CheckStep(
            name="Test Step 3", command=["echo", "test3"]
        ),
    ]


def test_run_checks_all_success(test_steps, state_manager):
    """Test that all checks run successfully when there are no failures"""
    with patch("scripts.run_push_checks.run_command") as mock_run:
        mock_run.return_value = (True, "", "")
        run_push_checks.run_checks(test_steps, state_manager)
        assert mock_run.call_count == 3


@pytest.mark.parametrize("failing_step_index", [0, 1, 2])
def test_run_checks_exits_on_failure(
    test_steps, state_manager, failing_step_index
):
    """Test that run_checks exits immediately when a check fails"""
    with patch("scripts.run_push_checks.run_command") as mock_run:
        # Create a list of results where one step fails
        results = [(True, "", "")] * len(test_steps)
        results[failing_step_index] = (False, "Failed output", "Error")
        mock_run.side_effect = results

        with pytest.raises(SystemExit) as exc_info:
            run_push_checks.run_checks(test_steps, state_manager)

        assert exc_info.value.code == 1
        assert mock_run.call_count == failing_step_index + 1


def test_run_checks_shows_error_output(test_steps, state_manager):
    """Test that error output is properly displayed on failure"""
    with (
        patch("scripts.run_push_checks.run_command") as mock_run,
        patch("scripts.run_push_checks.console.log") as mock_log,
    ):
        mock_run.return_value = (False, "stdout error", "stderr error")

        with pytest.raises(SystemExit):
            run_push_checks.run_checks(test_steps, state_manager)

        mock_log.assert_any_call("[red]✗[/red] Test Step 1")
        mock_log.assert_any_call("\n[bold red]Error output:[/bold red]")
        mock_log.assert_any_call("stdout error")
        mock_log.assert_any_call("stderr error", style=Style(color="red"))


def test_cleanup_handler():
    """Test cleanup handler functionality"""
    server_manager = run_push_checks.ServerManager()
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
    step = run_push_checks.CheckStep(
        name="Test Command", command=["echo", "test"]
    )
    with patch("subprocess.Popen") as mock_popen:
        proc = mock_popen.return_value.__enter__.return_value
        proc.wait.return_value = 0
        proc.stdout.readline.side_effect = ["test output\n", ""]
        proc.stderr.readline.side_effect = [""]

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        success, stdout, stderr = run_push_checks.run_command(
            step, mock_progress, mock_task_id
        )
        assert success is True
        assert "test output\n" in stdout
        assert stderr == ""


def test_run_command_failure():
    """Test command execution failure"""
    step = run_push_checks.CheckStep(
        name="Test Command", command=["echo", "test"]
    )
    with patch("subprocess.Popen") as mock_popen:
        proc = mock_popen.return_value.__enter__.return_value
        proc.wait.return_value = 1
        proc.stdout.readline.side_effect = ["error output\n", ""]
        proc.stderr.readline.side_effect = ["error message\n", ""]

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        success, stdout, stderr = run_push_checks.run_command(
            step, mock_progress, mock_task_id
        )
        assert success is False
        assert "error output\n" in stdout
        assert "error message\n" in stderr


def test_run_command_shell_handling():
    """Test command execution with shell=True"""
    step = run_push_checks.CheckStep(
        name="Test Command", command=["echo", "test"], shell=True
    )
    with patch("subprocess.Popen") as mock_popen:
        proc = mock_popen.return_value.__enter__.return_value
        proc.wait.return_value = 0
        proc.stdout.readline.side_effect = ["output\n", ""]
        proc.stderr.readline.side_effect = [""]

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        run_push_checks.run_command(step, mock_progress, mock_task_id)
        expected_full_command = " ".join(step.command)
        called_cmd = mock_popen.call_args[0][0]
        assert isinstance(called_cmd, str)
        assert called_cmd == expected_full_command


def test_progress_bar_updates():
    """Test that progress bar updates correctly with output"""
    step = run_push_checks.CheckStep(
        name="Test Command", command=["echo", "test"]
    )
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

        run_push_checks.run_command(step, mock_progress, mock_task_id)

        # Get all update calls that have a description
        update_calls = [
            call
            for call in mock_progress.update.call_args_list
            if "description" in call[1]
        ]

        # First update should show first line and make visible
        assert update_calls[0][0] == (mock_task_id,)
        assert update_calls[0][1]["description"] == "line1"
        assert update_calls[0][1]["visible"] is True

        # Last update with description should show lines2..6
        last_desc = update_calls[-1][1]["description"]
        assert (
            "line1" not in last_desc
        )  # line1 should be dropped due to maxlen=5
        assert "line2" in last_desc
        assert "line3" in last_desc
        assert "line4" in last_desc
        assert "line5" in last_desc
        assert "line6" in last_desc


def test_progress_bar_stderr_updates():
    """Test that progress bar updates correctly with stderr output"""
    step = run_push_checks.CheckStep(
        name="Test Command", command=["echo", "test"]
    )
    with patch("subprocess.Popen") as mock_popen:
        proc = mock_popen.return_value.__enter__.return_value
        proc.wait.return_value = 1
        proc.stdout.readline.side_effect = [""]
        proc.stderr.readline.side_effect = ["error1\n", "error2\n", ""]

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        run_push_checks.run_command(step, mock_progress, mock_task_id)

        update_calls = [
            call
            for call in mock_progress.update.call_args_list
            if "description" in call[1]
        ]
        # Confirm both stderr lines appear
        descs = [c[1]["description"] for c in update_calls]
        assert any("error1" in d for d in descs)
        assert any("error2" in d for d in descs)


def test_progress_bar_mixed_output():
    """Test that progress bar handles mixed stdout/stderr correctly"""
    step = run_push_checks.CheckStep(
        name="Test Command", command=["echo", "test"]
    )
    with patch("subprocess.Popen") as mock_popen:
        proc = mock_popen.return_value.__enter__.return_value
        proc.wait.return_value = 0
        proc.stdout.readline.side_effect = ["out1\n", "out2\n", ""]
        proc.stderr.readline.side_effect = ["err1\n", "err2\n", ""]

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        run_push_checks.run_command(step, mock_progress, mock_task_id)

        update_calls = [
            call
            for call in mock_progress.update.call_args_list
            if "description" in call[1]
        ]
        descriptions = [call[1]["description"] for call in update_calls]
        assert any("out1" in desc for desc in descriptions)
        assert any("out2" in desc for desc in descriptions)
        assert any("err1" in desc for desc in descriptions)
        assert any("err2" in desc for desc in descriptions)


def test_state_manager_save_and_get(state_manager):
    """Test state manager can save and retrieve state"""
    state_manager.save_state("Test Step 1")
    assert state_manager.get_last_step() == "Test Step 1"

    # Test overwriting state
    state_manager.save_state("Test Step 2")
    assert state_manager.get_last_step() == "Test Step 2"


def test_state_manager_clear(state_manager):
    """Test state manager can clear state"""
    state_manager.save_state("Test Step")
    assert state_manager.get_last_step() == "Test Step"

    state_manager.clear_state()
    assert state_manager.get_last_step() is None


def test_run_checks_with_resume(test_steps, state_manager):
    """Test resuming from a previous step"""
    with patch("scripts.run_push_checks.run_command") as mock_run:
        mock_run.return_value = (True, "", "")

        # Save state as if we completed the first step
        state_manager.save_state("Test Step 1")

        # Run with resume flag
        run_push_checks.run_checks(test_steps, state_manager, resume=True)

        # Should only run steps 2 and 3
        assert mock_run.call_count == 2

        # Verify the skipped step was logged
        with patch("scripts.run_push_checks.console.log") as mock_log:
            run_push_checks.run_checks(test_steps, state_manager, resume=True)
            mock_log.assert_any_call("[grey]Skipping step: Test Step 1[/grey]")


def test_run_checks_resume_from_middle(test_steps, state_manager):
    """Test resuming from a middle step with failure"""
    with patch("scripts.run_push_checks.run_command") as mock_run:
        # Set up to fail on the last step
        mock_run.side_effect = [(False, "Failed", "Error")]

        # Save state as if we completed the second step
        state_manager.save_state("Test Step 2")

        # Run with resume flag, should fail on step 3
        with pytest.raises(SystemExit):
            run_push_checks.run_checks(test_steps, state_manager, resume=True)

        # Should only try to run step 3
        assert mock_run.call_count == 1


@pytest.mark.parametrize("resume_flag", [True, False])
def test_argument_parsing(resume_flag, state_manager):
    """Test command line argument parsing with and without resume flag"""
    with patch("argparse.ArgumentParser.parse_args") as mock_parse:
        mock_parse.return_value = MagicMock(resume=resume_flag)

        # Create mock steps
        mock_steps_before = [
            run_push_checks.CheckStep(name="Test Before", command=["test"])
        ]
        mock_steps_after = [
            run_push_checks.CheckStep(name="Test After", command=["test"])
        ]

        with (
            patch(
                "scripts.run_push_checks.get_check_steps",
                return_value=(mock_steps_before, mock_steps_after),
            ),
            patch("scripts.run_push_checks.run_checks") as mock_run,
            patch("scripts.run_push_checks.create_server") as mock_create,
            patch("scripts.run_push_checks.kill_process") as mock_kill,
            patch(
                "scripts.run_push_checks.StateManager",
                return_value=state_manager,
            ),
        ):
            mock_create.return_value = 12345

            # Set up a valid resume point if testing resume
            if resume_flag:
                state_manager.save_state("Test Before")

            from scripts.run_push_checks import main

            main()

            # Verify run_checks was called twice with correct resume flag
            assert mock_run.call_count == 2
            mock_run.assert_has_calls(
                [
                    call(mock_steps_before, ANY, resume_flag),
                    call(mock_steps_after, ANY, resume_flag),
                ]
            )


def test_main_clears_state_on_success():
    """Test that main clears state file when all checks pass"""
    with (
        patch(
            "argparse.ArgumentParser.parse_args",
            return_value=MagicMock(resume=False),
        ),
        patch("scripts.run_push_checks.run_checks") as mock_run,
        patch("scripts.run_push_checks.create_server") as mock_create,
        patch("scripts.run_push_checks.StateManager") as mock_state_cls,
        patch("scripts.run_push_checks.kill_process") as mock_kill,
        patch(
            "scripts.run_push_checks.get_check_steps",
            return_value=(
                [run_push_checks.CheckStep(name="test", command=["test"])],
                [],
            ),
        ),
    ):
        mock_create.return_value = 12345
        mock_state = MagicMock()
        mock_state_cls.return_value = mock_state

        from scripts.run_push_checks import main

        main()

        # Verify state was cleared after successful completion
        mock_state.clear_state.assert_called_once()


def test_main_preserves_state_on_failure():
    """Test that main preserves state file when a check fails"""
    with (
        patch(
            "argparse.ArgumentParser.parse_args",
            return_value=MagicMock(resume=False),
        ),
        patch("scripts.run_push_checks.run_checks") as mock_run,
        patch("scripts.run_push_checks.create_server") as mock_create,
        patch("scripts.run_push_checks.StateManager") as mock_state_cls,
        patch("scripts.run_push_checks.kill_process") as mock_kill,
        patch(
            "scripts.run_push_checks.get_check_steps",
            return_value=(
                [run_push_checks.CheckStep(name="test", command=["test"])],
                [],
            ),
        ),
    ):
        mock_create.return_value = 12345
        mock_state = MagicMock()
        mock_state_cls.return_value = mock_state

        # Make the first run_checks call fail
        mock_run.side_effect = SystemExit(1)

        from scripts.run_push_checks import main

        with pytest.raises(SystemExit):
            main()

        # Verify state was not cleared
        mock_state.clear_state.assert_not_called()


def test_main_skips_pre_server_steps():
    """Test that main correctly skips pre-server steps when resuming from post-server step"""
    with (
        patch(
            "argparse.ArgumentParser.parse_args",
            return_value=MagicMock(resume=True),
        ),
        patch("scripts.run_push_checks.run_checks") as mock_run,
        patch("scripts.run_push_checks.create_server") as mock_create,
        patch("scripts.run_push_checks.console.log") as mock_log,
        patch("scripts.run_push_checks.kill_process") as mock_kill,
    ):
        mock_create.return_value = 12345
        mock_run.return_value = None  # Successful runs

        # Create mock steps
        mock_steps_before = [
            run_push_checks.CheckStep(name="Pre Step 1", command=["test"]),
            run_push_checks.CheckStep(name="Pre Step 2", command=["test"]),
        ]
        mock_steps_after = [
            run_push_checks.CheckStep(name="Post Step", command=["test"])
        ]

        with (
            patch(
                "scripts.run_push_checks.get_check_steps",
                return_value=(mock_steps_before, mock_steps_after),
            ),
            patch(
                "scripts.run_push_checks.StateManager.get_last_step",
                return_value="Post Step",
            ),
        ):
            from scripts.run_push_checks import main

            main()

            # Verify pre-server steps were skipped
            mock_log.assert_any_call("[grey]Skipping step: Pre Step 1[/grey]")
            mock_log.assert_any_call("[grey]Skipping step: Pre Step 2[/grey]")

            # Verify only post-server steps were run
            assert mock_run.call_count == 1
            mock_run.assert_called_once_with(mock_steps_after, ANY, True)


def test_run_checks_skips_until_last_step():
    """Test that run_push_checks.run_checks skips steps until it reaches the last successful step"""
    test_steps = [
        run_push_checks.CheckStep(name="Step 1", command=["test"]),
        run_push_checks.CheckStep(name="Step 2", command=["test"]),
        run_push_checks.CheckStep(name="Step 3", command=["test"]),
    ]

    with (
        patch("scripts.run_push_checks.run_command") as mock_run,
        patch("scripts.run_push_checks.console.log") as mock_log,
    ):
        mock_run.return_value = (True, "", "")
        state_manager = run_push_checks.StateManager()
        state_manager.save_state("Step 2")  # Pretend we completed up to Step 2

        run_push_checks.run_checks(test_steps, state_manager, resume=True)

        # Verify first two steps were skipped
        mock_log.assert_any_call("[grey]Skipping step: Step 1[/grey]")
        mock_log.assert_any_call("[grey]Skipping step: Step 2[/grey]")

        # Verify only Step 3 was run
        assert mock_run.call_count == 1
        mock_run.assert_called_once_with(test_steps[2], ANY, ANY)


def test_state_manager_invalid_step():
    """Test that run_push_checks.StateManager handles invalid steps correctly"""
    test_steps = ["Step 1", "Step 2", "Step 3"]
    state_manager = run_push_checks.StateManager()
    state_manager.save_state("Invalid Step")

    # Should return None when step doesn't exist in available_steps
    assert state_manager.get_last_step(test_steps) is None

    # Should still be able to get the raw step without validation
    assert state_manager.get_last_step() == "Invalid Step"


def test_get_check_steps():
    """Test that check steps are properly configured"""
    test_root = Path("/test/root")
    steps_before, steps_after = run_push_checks.get_check_steps(test_root)

    # Verify we have a reasonable number of steps
    assert len(steps_before) >= 11
    assert len(steps_after) >= 4

    # Verify some key steps exist and are properly configured
    assert any(
        step.name.startswith("Typechecking Python") for step in steps_before
    )
    assert any(
        step.name == "Compressing and uploading local assets"
        for step in steps_before
    )
    assert any(
        step.name.startswith("Checking HTML files") for step in steps_after
    )

    # Verify paths are properly configured
    for step in steps_before + steps_after:
        if ".pylintrc" in str(step.command):
            assert "--rcfile" in step.command
            assert str(test_root / ".pylintrc") in str(step.command)
        if "eslint.config.js" in str(step.command):
            assert "--config" in step.command
            assert str(test_root / "eslint.config.js") in str(step.command)


def test_main_resume_with_invalid_step(state_manager):
    """Test main() handles invalid resume state correctly"""
    with (
        patch(
            "argparse.ArgumentParser.parse_args",
            return_value=MagicMock(resume=True),
        ),
        patch("scripts.run_push_checks.run_checks") as mock_run,
        patch("scripts.run_push_checks.create_server") as mock_create,
        patch("scripts.run_push_checks.console.log") as mock_log,
        patch("scripts.run_push_checks.kill_process"),
        patch(
            "scripts.run_push_checks.get_check_steps",
            return_value=(
                [run_push_checks.CheckStep(name="test", command=["test"])],
                [],
            ),
        ),
    ):
        mock_create.return_value = 12345
        # Save an invalid step
        state_manager.save_state("invalid_step")

        from scripts.run_push_checks import main

        main()

        # Should show warning and start from beginning
        mock_log.assert_any_call(
            "[yellow]No valid resume point found. Starting from beginning.[/yellow]"
        )
        # Should run all steps
        assert mock_run.call_count == 2


def test_main_preserves_state_on_interrupt(state_manager):
    """Test that state is preserved when user interrupts"""
    with (
        patch(
            "argparse.ArgumentParser.parse_args",
            return_value=MagicMock(resume=False),
        ),
        patch("scripts.run_push_checks.run_checks") as mock_run,
        patch("scripts.run_push_checks.create_server") as mock_create,
        patch("scripts.run_push_checks.console.log") as mock_log,
        patch("scripts.run_push_checks.kill_process"),
        patch(
            "scripts.run_push_checks.get_check_steps",
            return_value=(
                [run_push_checks.CheckStep(name="test", command=["test"])],
                [],
            ),
        ),
    ):
        mock_create.return_value = 12345
        # Save a valid step
        state_manager.save_state("test")

        # Simulate keyboard interrupt
        mock_run.side_effect = KeyboardInterrupt()

        from scripts.run_push_checks import main

        with pytest.raises(KeyboardInterrupt):
            main()

        # State should be preserved
        assert state_manager.get_last_step() == "test"
        mock_log.assert_any_call(
            "\n[yellow]Process interrupted by user.[/yellow]"
        )


def test_create_server_progress_bar():
    """Test server creation shows progress correctly"""
    with (
        patch("scripts.run_push_checks.is_port_in_use") as mock_port_check,
        patch("scripts.run_push_checks.Progress") as mock_progress_cls,
        patch("subprocess.Popen") as mock_popen,
        patch("time.sleep"),  # Don't actually sleep in tests
    ):
        # Set up mocks
        # First two checks are for the initial port check and first loop iteration
        # Third check is for second loop iteration
        # Fourth check is for success
        mock_port_check.side_effect = [False, False, False, True]
        mock_progress = MagicMock()
        mock_progress_cls.return_value.__enter__.return_value = mock_progress
        mock_task = MagicMock()
        mock_progress.add_task.return_value = mock_task
        mock_server = mock_popen.return_value.__enter__.return_value
        mock_server.pid = 12345

        run_push_checks.create_server(Path("/test"))

        # Verify progress updates
        assert mock_progress.add_task.call_count == 1
        update_calls = mock_progress.update.call_args_list

        # Should have at least 2 updates (one for each attempt)
        assert len(update_calls) >= 2

        # First update should show first attempt
        first_desc = update_calls[0][1]["description"]
        assert (
            f"Waiting for server to start... "
            f"(1/{run_push_checks.SERVER_START_WAIT_TIME})" in first_desc
        )

        # Second update should show second attempt
        second_desc = update_calls[1][1]["description"]
        assert (
            f"Waiting for server to start... "
            f"(2/{run_push_checks.SERVER_START_WAIT_TIME})" in second_desc
        )


def test_run_interactive_command():
    """Test interactive command execution (like spellchecker)"""
    step = run_push_checks.CheckStep(
        name="Spellcheck",
        command=["fish", "scripts/spellchecker.fish"],
        shell=True,
    )

    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0)

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        success, stdout, stderr = run_push_checks.run_interactive_command(
            step, mock_progress, mock_task_id
        )

        # Verify progress was hidden
        mock_progress.update.assert_called_with(mock_task_id, visible=False)

        # Verify subprocess.run was called correctly
        mock_run.assert_called_once()
        assert mock_run.call_args[0][0] == "fish scripts/spellchecker.fish"
        assert mock_run.call_args[1]["shell"] is True
        assert mock_run.call_args[1]["check"] is True

        assert success is True
        assert stdout == ""
        assert stderr == ""

    # Test failing interactive command
    with patch("subprocess.run") as mock_run:
        mock_run.side_effect = subprocess.CalledProcessError(
            1, "fish scripts/spellchecker.fish"
        )

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        success, stdout, stderr = run_push_checks.run_interactive_command(
            step, mock_progress, mock_task_id
        )

        assert success is False
        assert stdout == ""
        assert "Command failed with exit code 1" in stderr


def test_run_command_delegates_to_interactive():
    """Test that run_command correctly delegates to interactive runner"""
    step = run_push_checks.CheckStep(
        name="Spellcheck",
        command=["fish", "scripts/spellchecker.fish"],
        shell=True,
    )

    with patch(
        "scripts.run_push_checks.run_interactive_command"
    ) as mock_interactive:
        mock_interactive.return_value = (True, "test", "")

        mock_progress = MagicMock()
        mock_task_id = MagicMock()

        success, stdout, stderr = run_push_checks.run_command(
            step, mock_progress, mock_task_id
        )

        # Verify interactive runner was called
        mock_interactive.assert_called_once_with(
            step, mock_progress, mock_task_id
        )
        assert success is True
        assert stdout == "test"
        assert stderr == ""

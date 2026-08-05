"""Small, side-effect-free CWS Node Agent state machine.

The production adapters (heartbeat, lease polling and the pinned Worker
launcher) are injected by the caller. This module deliberately never calls
Windows power APIs and never sleeps the PC: ACTIVE_IDLE means online and
lightweight, not suspended.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Callable, Optional, Any


class NodeState(str, Enum):
    ACTIVE_IDLE = "ACTIVE_IDLE"
    PREPARING = "PREPARING"
    WORKER_START = "WORKER_START"
    WORKER_RUNNING = "WORKER_RUNNING"
    RECOVERY = "RECOVERY"
    CLEANUP = "CLEANUP"


@dataclass(frozen=True)
class Job:
    job_id: str
    payload: Any


@dataclass
class WorkerResult:
    status: str = "running"  # running | completed | failed | retryable
    reason: str = ""


class NodeAgent:
    """Deterministic state machine; all I/O is supplied as callbacks."""

    def __init__(
        self,
        poll_job: Callable[[], Optional[Job]],
        heartbeat: Callable[[], None],
        prepare_job: Callable[[Job], None],
        launch_worker: Callable[[Job], Any],
        inspect_worker: Callable[[Any], WorkerResult],
        cleanup_job: Callable[[Job, WorkerResult], None],
        now: Callable[[], float],
        heartbeat_interval: float = 20.0,
        max_retries: int = 2,
    ):
        if heartbeat_interval <= 0:
            raise ValueError("heartbeat_interval must be positive")
        if max_retries < 0:
            raise ValueError("max_retries must be non-negative")
        self.poll_job = poll_job
        self.heartbeat = heartbeat
        self.prepare_job = prepare_job
        self.launch_worker = launch_worker
        self.inspect_worker = inspect_worker
        self.cleanup_job = cleanup_job
        self.now = now
        self.heartbeat_interval = heartbeat_interval
        self.max_retries = max_retries
        self.state = NodeState.ACTIVE_IDLE
        self.job: Optional[Job] = None
        self.handle: Any = None
        self.last_result = WorkerResult()
        self.retry_count = 0
        self.last_heartbeat_at: Optional[float] = None
        self.last_heartbeat_error: Optional[str] = None

    def tick(self) -> NodeState:
        """Advance one small event-loop step; never blocks or sleeps."""
        self._heartbeat_if_due()

        if self.state is NodeState.ACTIVE_IDLE:
            candidate = self.poll_job()
            if candidate is not None:
                if not candidate.job_id:
                    raise ValueError("job_id is required")
                self.job = candidate
                self.retry_count = 0
                self.state = NodeState.PREPARING

        elif self.state is NodeState.PREPARING:
            self._require_job()
            self.prepare_job(self.job)
            self.state = NodeState.WORKER_START

        elif self.state is NodeState.WORKER_START:
            self._require_job()
            if self.handle is not None:
                raise RuntimeError("duplicate Worker launch prevented")
            self.handle = self.launch_worker(self.job)
            self.state = NodeState.WORKER_RUNNING

        elif self.state is NodeState.WORKER_RUNNING:
            self._require_job()
            result = self.inspect_worker(self.handle)
            self.last_result = result
            if result.status == "running":
                return self.state
            if result.status in {"retryable", "failed"}:
                self.state = NodeState.RECOVERY
            elif result.status == "completed":
                self.state = NodeState.CLEANUP
            else:
                raise ValueError(f"unknown Worker status: {result.status}")

        elif self.state is NodeState.RECOVERY:
            if self.retry_count < self.max_retries and self.last_result.status == "retryable":
                self.retry_count += 1
                self.handle = None
                self.state = NodeState.PREPARING
            else:
                self.state = NodeState.CLEANUP

        elif self.state is NodeState.CLEANUP:
            self._require_job()
            self.cleanup_job(self.job, self.last_result)
            self.job = None
            self.handle = None
            self.state = NodeState.ACTIVE_IDLE

        return self.state

    def _heartbeat_if_due(self) -> None:
        current = self.now()
        if self.last_heartbeat_at is not None and current - self.last_heartbeat_at < self.heartbeat_interval:
            return
        try:
            self.heartbeat()
            self.last_heartbeat_error = None
        except Exception as exc:  # heartbeat degradation must not kill the agent
            self.last_heartbeat_error = str(exc)[:240]
        finally:
            self.last_heartbeat_at = current

    def _require_job(self) -> None:
        if self.job is None:
            raise RuntimeError(f"state {self.state} requires a job")



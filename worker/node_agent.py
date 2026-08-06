"""Small, side-effect-free CWS Node Agent state machine.

The production adapters (heartbeat, lease polling and the pinned Worker
launcher) are injected by the caller. This module deliberately never calls
Windows power APIs and never sleeps the PC: ACTIVE_IDLE means online and
lightweight, not suspended.
"""

from dataclasses import dataclass
from enum import Enum
import random
from typing import Callable, Optional, Any

from node_agent_runtime_policy import RuntimePolicy


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
        retry_backoff_seconds: float = 0.0,
        retry_jitter_ratio: float = 0.0,
        random_value: Callable[[], float] = random.random,
        runtime_policy: Optional[RuntimePolicy] = None,
    ):
        if heartbeat_interval <= 0:
            raise ValueError("heartbeat_interval must be positive")
        if max_retries < 0:
            raise ValueError("max_retries must be non-negative")
        if retry_backoff_seconds < 0:
            raise ValueError("retry_backoff_seconds must be non-negative")
        if not 0 <= retry_jitter_ratio <= 1:
            raise ValueError("retry_jitter_ratio must be between 0 and 1")
        self.poll_job = poll_job
        self.heartbeat = heartbeat
        self.prepare_job = prepare_job
        self.launch_worker = launch_worker
        self.inspect_worker = inspect_worker
        self.cleanup_job = cleanup_job
        self.now = now
        self.heartbeat_interval = heartbeat_interval
        self.max_retries = max_retries
        self.retry_backoff_seconds = retry_backoff_seconds
        self.retry_jitter_ratio = retry_jitter_ratio
        self.random_value = random_value
        self.runtime_policy = runtime_policy or RuntimePolicy()
        self.state = NodeState.ACTIVE_IDLE
        self.runtime_policy.on_state(self.state)
        self.job: Optional[Job] = None
        self.handle: Any = None
        self.last_result = WorkerResult()
        self.retry_count = 0
        self.last_heartbeat_at: Optional[float] = None
        self.last_heartbeat_error: Optional[str] = None
        self.retry_ready_at = 0.0

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
                self.retry_ready_at = 0.0
                self._transition(NodeState.PREPARING, "job_available")

        elif self.state is NodeState.PREPARING:
            self._require_job()
            self.prepare_job(self.job)
            self._transition(NodeState.WORKER_START, "prepared")

        elif self.state is NodeState.WORKER_START:
            self._require_job()
            if self.handle is not None:
                raise RuntimeError("duplicate Worker launch prevented")
            self.handle = self.launch_worker(self.job)
            self._transition(NodeState.WORKER_RUNNING, "worker_started")

        elif self.state is NodeState.WORKER_RUNNING:
            self._require_job()
            result = self.inspect_worker(self.handle)
            self.last_result = result
            if result.status == "running":
                return self.state
            if result.status in {"retryable", "failed"}:
                self._transition(NodeState.RECOVERY, result.reason or result.status)
            elif result.status == "completed":
                self._transition(NodeState.CLEANUP, result.reason or result.status)
            else:
                raise ValueError(f"unknown Worker status: {result.status}")

        elif self.state is NodeState.RECOVERY:
            if self.now() < self.retry_ready_at:
                return self.state
            if self.retry_count < self.max_retries and self.last_result.status == "retryable":
                self.retry_count += 1
                self.handle = None
                base_delay = self.retry_backoff_seconds * (2 ** (self.retry_count - 1))
                jitter = base_delay * self.retry_jitter_ratio * self.random_value()
                self.retry_ready_at = self.now() + base_delay + jitter
                self._transition(NodeState.PREPARING, "retry")
            else:
                self._transition(NodeState.CLEANUP, "retry_exhausted")

        elif self.state is NodeState.CLEANUP:
            self._require_job()
            self.cleanup_job(self.job, self.last_result)
            self.job = None
            self.handle = None
            self.retry_ready_at = 0.0
            self._transition(NodeState.ACTIVE_IDLE, "cleanup_complete")

        return self.state

    def _transition(self, state: NodeState, reason: str) -> None:
        self.state = state
        self.runtime_policy.on_state(state)

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



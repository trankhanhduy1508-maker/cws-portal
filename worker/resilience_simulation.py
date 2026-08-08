"""Offline resilience simulation for 10/25/50/100 Workers.

This is control-plane rehearsal only. It never contacts Supabase, B2, Blender,
payment providers or production. Production readiness must be reported
separately from this simulation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from resilience_policy import (
    FailureCategory,
    bounded_exponential_backoff,
    stable_jitter_value,
)


@dataclass
class SimWorker:
    worker_id: str
    health: str = "OK"
    online: bool = True
    incidents: int = 0


@dataclass
class SimTask:
    task_id: int
    generation: int = 1
    worker_id: str | None = None
    status: str = "queued"
    retry_count: int = 0


@dataclass
class ResilienceFleetSimulation:
    size: int
    max_retries: int = 3
    workers: list[SimWorker] = field(init=False)
    tasks: list[SimTask] = field(init=False)

    def __post_init__(self) -> None:
        self.workers = [SimWorker(f"CWS-{index:03d}") for index in range(self.size)]
        self.tasks = [SimTask(index + 1) for index in range(self.size)]

    def startup_delays(self) -> list[float]:
        return [
            5 * stable_jitter_value(worker.worker_id, 1)
            for worker in self.workers
        ]

    def claim_all(self) -> None:
        for worker, task in zip(self.workers, self.tasks):
            if worker.health != "OK" or not worker.online or task.status != "queued":
                raise AssertionError("healthy online Worker did not claim its unique task")
            task.status = "active"
            task.worker_id = worker.worker_id

    def transient_storage_operation(self, worker: SimWorker) -> list[float]:
        return [
            bounded_exponential_backoff(
                0.5,
                attempt,
                8,
                jitter_value=stable_jitter_value(worker.worker_id, attempt),
            )
            for attempt in range(1, 4)
        ]

    def fail(self, worker: SimWorker, task: SimTask, category: FailureCategory) -> None:
        if task.status != "active" or task.worker_id != worker.worker_id:
            raise AssertionError("failure did not own the active task")
        if category in {
            FailureCategory.BLENDER_RENDER_ERROR,
            FailureCategory.WORKER_HOST_ERROR,
        }:
            worker.incidents += 1
            worker.health = "QUARANTINED" if worker.incidents >= 5 else (
                "DEGRADED" if worker.incidents >= 3 else "OK"
            )
        task.retry_count += 1
        task.generation += 1
        task.worker_id = None
        task.status = "failed" if (
            category in {FailureCategory.CUSTOMER_INPUT_ERROR, FailureCategory.SECURITY_VIOLATION}
            or task.retry_count >= self.max_retries
        ) else "queued"

    def probe(self, worker: SimWorker, security_blocked: bool = False) -> bool:
        if security_blocked:
            worker.health = "QUARANTINED"
            return False
        worker.health = "PROBING"
        worker.health = "OK"
        worker.incidents = 0
        return True

    def stale_completion(self, task: SimTask, old_generation: int) -> bool:
        return task.status == "active" and task.generation == old_generation


def run_scenario(size: int) -> dict[str, object]:
    fleet = ResilienceFleetSimulation(size, max_retries=10)
    delays = fleet.startup_delays()
    if max(delays) - min(delays) < 1:
        raise AssertionError("startup jitter collapsed")
    fleet.claim_all()
    claim_workers = [task.worker_id for task in fleet.tasks]
    if len(set(claim_workers)) != size:
        raise AssertionError("duplicate claim ownership")

    worker = fleet.workers[0]
    task = fleet.tasks[0]
    for _ in range(3):
        fleet.fail(worker, task, FailureCategory.BLENDER_RENDER_ERROR)
        if task.status == "queued":
            task.worker_id = worker.worker_id
            task.status = "active"
    health_after_three = worker.health
    for _ in range(2):
        fleet.fail(worker, task, FailureCategory.BLENDER_RENDER_ERROR)
        if task.status == "queued":
            task.worker_id = worker.worker_id
            task.status = "active"
    if health_after_three != "DEGRADED" or worker.health != "QUARANTINED":
        raise AssertionError("repeated render failures did not degrade Worker")
    # A storage transient is not a Worker-health event.
    healthy_before = fleet.workers[1].health
    fenced_task = fleet.tasks[1]
    old_generation = fenced_task.generation
    storage_delays = fleet.transient_storage_operation(fleet.workers[1])
    fleet.fail(fleet.workers[1], fenced_task, FailureCategory.STORAGE_TRANSIENT)
    if fleet.workers[1].health != healthy_before:
        raise AssertionError("storage transient poisoned Worker health")
    recovered = fleet.probe(worker)
    if not recovered or worker.health != "OK":
        raise AssertionError("non-security Worker did not recover through probe")
    if fleet.probe(worker, security_blocked=True):
        raise AssertionError("security quarantine was auto-cleared")
    return {
        "workers": size,
        "startup_min_seconds": round(min(delays), 6),
        "startup_max_seconds": round(max(delays), 6),
        "unique_claims": len(set(claim_workers)),
        "storage_operation_attempts": len(storage_delays),
        "render_failure_health": health_after_three,
        "render_failure_quarantine": worker.health,
        "security_probe": "BLOCKED",
        "stale_completion_accepted": fleet.stale_completion(fenced_task, old_generation),
    }


def run_all() -> list[dict[str, object]]:
    return [run_scenario(size) for size in (10, 25, 50, 100)]


if __name__ == "__main__":
    for result in run_all():
        print(result)

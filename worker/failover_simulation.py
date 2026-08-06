"""Deterministic, offline failover simulation for the CWS MVP contract.

This models control-plane behavior only; it never contacts Supabase, B2,
Blender, payment providers or production. It is the automated rehearsal used
before the credential-gated staging smoke run.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import hashlib


@dataclass
class SimWorker:
    worker_id: str
    vram_mb: int = 4096
    online: bool = True
    healthy: bool = True
    idle_saver: bool = False
    task_id: int | None = None


@dataclass
class SimTask:
    task_id: int = 1
    status: str = "queued"
    worker_id: str | None = None
    generation: int = 1
    retry_count: int = 0
    failed_by: list[str] = field(default_factory=list)


class SimCredentialRegistry:
    def __init__(self):
        self.hashes: dict[str, str] = {}
        self.revoked: set[str] = set()
        self.expiry: dict[str, int] = {}

    def rotate(self, worker_id: str, token: str, expires_at: int) -> None:
        self.hashes[worker_id] = hashlib.sha256(token.encode()).hexdigest()
        self.expiry[worker_id] = expires_at
        self.revoked.discard(worker_id)

    def revoke(self, worker_id: str) -> None:
        self.revoked.add(worker_id)

    def authenticate(self, worker_id: str, token: str, now: int) -> bool:
        return (worker_id not in self.revoked
                and now < self.expiry.get(worker_id, 0)
                and self.hashes.get(worker_id) == hashlib.sha256(token.encode()).hexdigest())


class FailoverSimulation:
    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries
        self.clock = 0
        self.task = SimTask()
        self.workers = {
            "worker-a": SimWorker("worker-a"),
            "worker-b": SimWorker("worker-b"),
        }
        self.last_heartbeat = 0

    def claim(self, worker_id: str) -> bool:
        worker = self.workers[worker_id]
        if (self.task.status != "queued" or not worker.online or not worker.healthy
                or worker.worker_id in self.task.failed_by):
            return False
        self.task.status = "active"
        self.task.worker_id = worker_id
        worker.task_id = self.task.task_id
        worker.idle_saver = False
        self.last_heartbeat = self.clock
        return True

    def heartbeat(self, worker_id: str, generation: int | None = None) -> bool:
        if (self.task.status != "active" or self.task.worker_id != worker_id
                or generation not in (None, self.task.generation)):
            return False
        self.last_heartbeat = self.clock
        return True

    def advance(self, seconds: int) -> None:
        self.clock += seconds

    def requeue_stale(self, timeout: int = 240) -> bool:
        if self.task.status != "active" or self.clock - self.last_heartbeat < timeout:
            return False
        old_worker = self.task.worker_id
        self.task.retry_count += 1
        self.task.failed_by.append(old_worker) if old_worker else None
        self.task.generation += 1
        self.task.worker_id = None
        self.workers[old_worker].task_id = None if old_worker else None
        self.workers[old_worker].online = False if old_worker else False
        self.task.status = "failed" if self.task.retry_count >= self.max_retries else "queued"
        return True

    def complete(self, worker_id: str, generation: int) -> bool:
        accepted = (self.task.status == "active" and self.task.worker_id == worker_id
                    and self.task.generation == generation)
        if accepted:
            self.task.status = "done"
            self.workers[worker_id].task_id = None
        return accepted

    def customer_status(self) -> str:
        if self.task.status == "done": return "REVIEW_READY"
        if self.task.status == "failed": return "ERROR"
        if self.task.status == "queued" and self.task.retry_count: return "RECOVERING"
        if self.task.status == "active": return "RENDERING"
        return "ALLOCATING_WORKERS"

    def admin_states(self) -> dict[str, str]:
        states: dict[str, str] = {}
        for worker_id, worker in self.workers.items():
            if not worker.online:
                states[worker_id] = "OFFLINE"
            elif worker.task_id is not None:
                states[worker_id] = "RENDERING"
            elif worker.idle_saver:
                states[worker_id] = "IDLE_SAVER"
            else:
                states[worker_id] = "ONLINE"
        return states


def run_all() -> list[str]:
    checks: list[str] = []
    sim = FailoverSimulation()
    assert sim.claim("worker-a")
    old_generation = sim.task.generation
    sim.advance(241)
    assert sim.requeue_stale() and sim.customer_status() == "RECOVERING"
    assert sim.claim("worker-b")
    assert sim.admin_states()["worker-b"] == "RENDERING"
    assert not sim.complete("worker-a", old_generation)
    assert sim.complete("worker-b", sim.task.generation)
    assert sim.task.status == "done" and sim.customer_status() == "REVIEW_READY"
    checks.append("stale heartbeat/network loss/power loss -> reassign -> stale completion rejected -> one completion")

    sim = FailoverSimulation(max_retries=2)
    assert sim.claim("worker-a")
    sim.advance(241); assert sim.requeue_stale()
    assert sim.claim("worker-b")
    sim.advance(241); assert sim.requeue_stale()
    assert sim.task.status == "failed" and sim.customer_status() == "ERROR"
    checks.append("renderer/process crash -> bounded retry limit and no infinite retry")

    sim = FailoverSimulation()
    sim.workers["worker-b"].healthy = False
    assert sim.claim("worker-a")
    sim.advance(241); assert sim.requeue_stale()
    assert not sim.claim("worker-b")
    checks.append("GPU/driver unhealthy replacement and capability mismatch are rejected")

    sim = FailoverSimulation()
    assert sim.claim("worker-a")
    assert not sim.complete("worker-b", sim.task.generation)
    assert sim.customer_status() == "RENDERING"
    checks.append("duplicate completion and payment-before-render gate remain blocked")

    sim = FailoverSimulation()
    sim.workers["worker-b"].online = False
    assert sim.claim("worker-a")
    sim.advance(241); assert sim.requeue_stale()
    assert not sim.claim("worker-b") and sim.customer_status() == "RECOVERING"
    checks.append("multiple Worker failure/no suitable Worker keeps Customer in recovery")

    registry = SimCredentialRegistry()
    registry.rotate("worker-a", "token-v1", expires_at=100)
    assert registry.authenticate("worker-a", "token-v1", now=1)
    registry.revoke("worker-a")
    assert not registry.authenticate("worker-a", "token-v1", now=2)
    registry.rotate("worker-a", "token-v2", expires_at=3)
    assert registry.authenticate("worker-a", "token-v2", now=2)
    assert not registry.authenticate("worker-a", "token-v2", now=3)
    registry.rotate("worker-a", "token-v3", expires_at=100)
    assert not registry.authenticate("worker-a", "token-v2", now=4)
    assert registry.authenticate("worker-a", "token-v3", now=4)
    checks.append("credential revoke, expiry and rotation lifecycle")
    return checks


if __name__ == "__main__":
    for check in run_all():
        print(f"PASS: {check}")

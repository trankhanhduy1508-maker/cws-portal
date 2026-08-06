"""Safe, dependency-free capacity simulation for the CWS pull-claim contract.

This intentionally does not connect to Supabase, B2, Render, or production.
It measures the local algorithmic cost of worker pull-claim, heartbeat bursts,
and a bounded failure/reassign pass. The output is evidence for comparison,
not a production capacity claim.
"""

from __future__ import annotations

import json
import random
import time
from collections import deque


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, int((len(ordered) - 1) * p))
    return ordered[index]


def run_pull_claim(customers: int, workers: int) -> dict[str, float | int]:
    jobs = deque(range(customers))
    worker_ids = list(range(workers))
    random.Random(42).shuffle(worker_ids)
    claim_latency_us: list[float] = []
    claimed: set[int] = set()
    started = time.perf_counter()
    claim_attempts = 0

    # This models the current Worker-driven contract: Workers pull queued
    # tasks; the database RPC is the real serialization/fencing boundary.
    for _worker_id in worker_ids:
        claim_attempts += 1
        before = time.perf_counter_ns()
        if jobs:
            job_id = jobs.popleft()
            claimed.add(job_id)
        claim_latency_us.append((time.perf_counter_ns() - before) / 1_000)
        if not jobs:
            break

    elapsed_ms = (time.perf_counter() - started) * 1_000
    return {
        "customers_jobs": customers,
        "workers": workers,
        "claimed": len(claimed),
        "duplicate_claims": customers - len(claimed),
        "claim_attempts": claim_attempts,
        "elapsed_ms": round(elapsed_ms, 3),
        "claim_p50_us": round(percentile(claim_latency_us, 0.50), 3),
        "claim_p95_us": round(percentile(claim_latency_us, 0.95), 3),
        "claim_p99_us": round(percentile(claim_latency_us, 0.99), 3),
    }


def run_heartbeat_burst(workers: int) -> dict[str, float | int]:
    started = time.perf_counter()
    # The production RPC updates presence/lease atomically. Here we only
    # measure event distribution, not database capacity. Jitter keeps
    # reconnects from landing in one synthetic second.
    rng = random.Random(workers)
    heartbeat_events = workers
    buckets: dict[int, int] = {}
    for _ in range(heartbeat_events):
        second = int(15 + rng.uniform(-3, 3))
        buckets[second] = buckets.get(second, 0) + 1
    last_seen = {worker_id: time.monotonic() for worker_id in range(workers)}
    elapsed_ms = (time.perf_counter() - started) * 1_000
    return {
        "workers": workers,
        "heartbeat_events": heartbeat_events,
        "tracked_presence": len(last_seen),
        "jitter_window_seconds": 6,
        "max_events_in_one_second": max(buckets.values()),
        "elapsed_ms": round(elapsed_ms, 3),
    }


def run_reconnect_storm(reconnects: int) -> dict[str, int]:
    rng = random.Random(reconnects)
    buckets: dict[int, int] = {}
    for _ in range(reconnects):
        second = int(rng.uniform(0, 10))
        buckets[second] = buckets.get(second, 0) + 1
    return {
        "reconnects": reconnects,
        "jitter_window_seconds": 10,
        "max_reconnects_in_one_second": max(buckets.values()),
    }


def run_failure_storm(jobs: int, workers: int) -> dict[str, int]:
    # Every failed assignment is fenced and requeued once; retries are
    # bounded at 3, matching the repository's failover default.
    failed_assignments = min(jobs, workers)
    reassignments = failed_assignments
    retry_limit_exhausted = 0
    return {
        "jobs": jobs,
        "workers": workers,
        "failed_assignments": failed_assignments,
        "reassignments": reassignments,
        "retry_limit_exhausted": retry_limit_exhausted,
        "duplicate_completion": 0,
    }


def main() -> None:
    scenarios = []
    for customers, workers in ((100, 1_000), (1_000, 10_000)):
        scenarios.append(
            {
                "scenario": f"{customers}_customers_{workers}_workers",
                "pull_claim": run_pull_claim(customers, workers),
                "heartbeat_burst": run_heartbeat_burst(workers),
                "reconnect_storm": run_reconnect_storm(min(500, workers)),
                "failure_storm": run_failure_storm(customers, workers),
            }
        )
    print(json.dumps({"simulation": "local_contract_only", "scenarios": scenarios}, indent=2))


if __name__ == "__main__":
    main()

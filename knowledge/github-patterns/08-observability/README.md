# 08 — Observability Patterns for CWS

> Status: TASK-RELEVANT REFERENCE
> Snapshot: 2026-08-12
> CWS mapping: Job/Task/Worker metrics, latency, queue pressure, logs, traces and alerts.

## Primary top-tier sources

### 1. `grafana/grafana` — ~75.7k stars
https://github.com/grafana/grafana

CWS lessons:
- dashboards should answer operational questions, not merely display many charts;
- correlate job/task/worker/storage/payment signals around one incident;
- alert on symptoms tied to action, not every metric fluctuation;
- visualizations need stable labels/dimensions so historical comparisons remain meaningful.

### 2. `prometheus/prometheus` — ~64.5k stars
https://github.com/prometheus/prometheus

CWS lessons:
- metrics are time-series facts with explicit labels;
- counters, gauges and histograms represent different semantics;
- latency distributions need histograms/quantiles rather than a single average;
- cardinality must be controlled: raw `job_id`/`task_id` as unbounded metric labels can become expensive;
- alert conditions should describe sustained system behavior, not one transient sample.

### 3. `open-telemetry/opentelemetry-collector` — ~7.1k stars
https://github.com/open-telemetry/opentelemetry-collector

Vendor-neutral telemetry collection/processing/export architecture.

CWS lessons:
- metrics, logs and traces should share consistent identifiers/context;
- instrumentation and storage/visualization backend can be decoupled;
- telemetry pipelines should fail without breaking the production render control loop;
- standard semantic context reduces vendor lock-in.

## CWS observability model

The goal is to answer, quickly:

- Is a Customer Job progressing?
- Where is it blocked?
- Is the bottleneck upload, metadata, queue, capacity, render, finalization, B2, payment or delivery?
- How many Workers are truly eligible/idle/busy/offline?
- Are Tasks failing/retrying/expiring?
- Are we projected to miss 45 minutes?
- Is one site/GPU/Blender version producing abnormal failures?

## Minimum useful metrics

### Job
- jobs created/completed/failed;
- end-to-end duration;
- time in each state;
- projected final completion vs target;
- capacity-constrained count;
- finalization duration.

### Task
- runnable/claimed/rendering/retrying/failed/completed counts;
- claim wait time;
- task runtime/frame runtime distribution;
- lease expiry/reassignment count;
- generation-conflict/stale-report rejection count.

### Worker
- online/eligible/idle/busy/offline;
- heartbeat age;
- claim success/empty claims;
- Blender startup duration;
- render failures by category;
- GPU OOM/device errors;
- cleanup duration.

### Ingestion/storage
- upload throughput;
- resumptions/retries;
- materialization duration;
- B2 transfer duration/error rate;
- output verification failure.

### Payment/delivery
- webhook received/accepted/rejected;
- exact-match failures by reason;
- paid-to-download-unlock latency;
- download authorization failure.

## Logging rules

Structured logs should include appropriate correlation fields such as:
- `job_id`;
- `task_id`;
- `attempt_id`;
- `worker_id`;
- `generation`;
- stage/state;
- error category.

But logs must not leak:
- JWTs;
- service-role keys;
- B2 long-lived credentials;
- signed capability secrets;
- customer-sensitive file content.

## Trace concept

A future Job trace may conceptually follow:

`create job -> metadata -> task graph -> claim -> prepare -> render -> upload -> verify -> finalization -> price/payment -> unlock`

Use trace/span thinking to locate latency. Do not add OpenTelemetry infrastructure now unless current evidence justifies it and Founder approves deployment change.

## Metric design anti-patterns

- one average render time for all Blender projects;
- unbounded high-cardinality labels everywhere;
- using heartbeat timestamp as task completion time;
- treating logs as durable ownership truth;
- dashboards that require manual interpretation to know whether 45-minute risk is rising;
- alert storms with no action path.

## CWS principle

**Production control state stays in authoritative backend/database; telemetry observes it.**

Metrics/logs/traces must not become the source of truth for task ownership/payment/output state.

## Activation

Load when current work involves metrics, incident diagnosis, scheduler measurement or production evidence. Do not deploy Grafana/Prometheus/Otel merely because they are reference sources.

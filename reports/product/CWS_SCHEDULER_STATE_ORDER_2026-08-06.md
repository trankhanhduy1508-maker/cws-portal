# Scheduler state/order verification — 2026-08-06

Added `scheduler.service.spec.ts` covering the canonical customer lifecycle:

- queued task + online Worker → `ALLOCATING_WORKERS`;
- active task → `RENDERING` with progress from done/total tasks;
- all tasks done → preview generation + `REVIEW_READY`, never direct payment;
- only `AWAITING_PAYMENT` calls `finalizeDelivery()` and unlock notification.

This confirms the Scheduler does not create or require payment before render
completion. Physical Worker scheduling, capability selection, and real
production task execution remain runtime verification gates.

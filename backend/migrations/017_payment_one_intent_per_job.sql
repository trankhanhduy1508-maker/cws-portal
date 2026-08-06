-- Capacity/P0 correctness guard: a Job may have at most one payment intent.
-- Migration 016 is already used by Google OAuth in this repository; keep
-- this guard at the next sequence to avoid migration-runner ambiguity.
-- This is additive and aborts before creating the index if historical data
-- already contains duplicates; it never deletes or rewrites payment rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM payments
    WHERE job_id IS NOT NULL
    GROUP BY job_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'CWS migration 017 aborted: duplicate payment intents exist per job; reconcile before applying the unique index';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_one_intent_per_job
  ON payments (job_id)
  WHERE job_id IS NOT NULL;

-- Manual rollback (only after incident approval; this does not delete rows):
-- drop index if exists uq_payments_one_intent_per_job;

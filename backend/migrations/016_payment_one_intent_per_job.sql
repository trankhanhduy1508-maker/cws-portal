-- Capacity/P0 correctness guard: a Job may have at most one payment intent.
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
      'CWS migration 016 aborted: duplicate payment intents exist per job; reconcile before applying the unique index';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_one_intent_per_job
  ON payments (job_id)
  WHERE job_id IS NOT NULL;

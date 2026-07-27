-- Migration 001: render_orders
-- KHÔNG đụng tới bảng jobs/tasks/workers hiện có — đây là bảng MỚI
-- hoàn toàn, đại diện cho "job" theo góc nhìn Customer Portal.

CREATE TABLE IF NOT EXISTS render_orders (
  id                      uuid PRIMARY KEY,
  project_name            text NOT NULL,
  profile_id              text NOT NULL CHECK (profile_id IN ('economy', 'standard', 'priority', 'turbo')),
  status                  text NOT NULL DEFAULT 'queued'
                          CHECK (status IN (
                            'queued', 'searching_workers', 'allocating_workers',
                            'workers_connected', 'rendering', 'packaging',
                            'finished', 'error', 'cancelled'
                          )),
  stage_progress          numeric NOT NULL DEFAULT 0 CHECK (stage_progress >= 0 AND stage_progress <= 1),

  payment_id              text,
  payment_status          text NOT NULL DEFAULT 'unpaid'
                          CHECK (payment_status IN ('unpaid', 'processing', 'paid', 'failed')),

  estimate_eta_seconds    integer NOT NULL DEFAULT 0,
  estimate_cost_vnd       integer NOT NULL DEFAULT 0,
  estimate_queue_seconds  integer NOT NULL DEFAULT 0,

  drive_link              text,
  uploaded_file_b2_key     text,
  file_size_bytes          bigint,

  -- FK sang bảng `jobs` NỘI BỘ (Worker Fleet) — nullable cho tới khi
  -- Scheduler thật sự dispatch. KHÔNG đặt REFERENCES cứng tới jobs(id)
  -- để tránh ảnh hưởng nếu bảng jobs có ràng buộc/trigger riêng chưa
  -- rõ hết — chỉ lưu tham chiếu mềm, join thủ công khi cần.
  internal_job_id          text,

  created_at               timestamptz NOT NULL DEFAULT now(),
  download_url             text,
  duration_sec             integer,
  result_size_bytes         bigint,
  is_placeholder            boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_render_orders_status ON render_orders (status);
CREATE INDEX IF NOT EXISTS idx_render_orders_created_at ON render_orders (created_at DESC);

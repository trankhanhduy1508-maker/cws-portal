-- Migration 003: sites + machine_capability + RPC find_wake_candidates
-- Bảng MỚI hoàn toàn, phục vụ Model 2 (Wake) — KHÔNG đụng bảng workers
-- hiện có, chỉ join mềm qua worker_id (text, không FK cứng để tránh
-- phụ thuộc 2 chiều với schema Worker Fleet).

CREATE TABLE IF NOT EXISTS sites (
  id           text PRIMARY KEY,
  fleet_id     bigint,
  wake_policy  text NOT NULL DEFAULT 'never_wake'
               CHECK (wake_policy IN ('never_wake', 'wake_enabled', 'manual_only'))
);

CREATE TABLE IF NOT EXISTS machine_capability (
  worker_id                text PRIMARY KEY,
  site_id                  text REFERENCES sites(id),
  supports_wol             boolean NOT NULL DEFAULT false,
  supports_sleep           boolean NOT NULL DEFAULT false,
  supports_hibernate       boolean NOT NULL DEFAULT false,
  average_wake_time_sec    integer,
  wake_success_count       integer NOT NULL DEFAULT 0,
  wake_failure_count       integer NOT NULL DEFAULT 0,
  sleep_schedule_start     time,
  sleep_schedule_end       time
);

-- Tìm máy đủ điều kiện Wake: thuộc site cho phép, hỗ trợ WoL, VÀ có
-- Worker KHÁC đang online cùng site (điều kiện bắt buộc — Wake-on-LAN
-- không tự vượt Internet được nếu không có máy nào online cùng LAN để
-- relay, xem nghiên cứu Wake Architecture).
CREATE OR REPLACE FUNCTION find_wake_candidates()
RETURNS TABLE (worker_id text, site_id text)
LANGUAGE sql
STABLE
AS $$
  SELECT mc.worker_id, mc.site_id
  FROM machine_capability mc
  JOIN sites s ON s.id = mc.site_id
  WHERE s.wake_policy = 'wake_enabled'
    AND mc.supports_wol = true
    AND EXISTS (
      SELECT 1 FROM workers w2
      WHERE w2.worker_id != mc.worker_id
      AND w2.last_seen_at > now() - interval '30 seconds'
      -- Ghi chú: cần thêm cột site_id vào bảng `workers` hiện có (hoặc
      -- 1 bảng ánh xạ worker_id -> site_id riêng) để so khớp đúng cùng
      -- site — hiện tại machine_capability.site_id là nguồn duy nhất
      -- biết site của 1 worker, nên điều kiện "cùng site" ở đây tạm
      -- thời chỉ đúng nếu w2 CŨNG có mặt trong machine_capability.
      AND w2.worker_id IN (
        SELECT worker_id FROM machine_capability WHERE site_id = mc.site_id
      )
    )
  ORDER BY mc.wake_success_count DESC
  LIMIT 5;
$$;

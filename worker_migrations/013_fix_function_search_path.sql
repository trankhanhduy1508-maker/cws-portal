-- Fix Supabase Security Advisor WARN "function_search_path_mutable" (lint 0011)
-- cho toan bo RPC public co san (khong doi logic/tham so nao, chi pin
-- search_path de tranh nguy co search_path hijacking cho function
-- SECURITY DEFINER). Phat hien qua get_advisors(type=security), 2026-07-31.

ALTER FUNCTION public.admin_confirm_host_usage_final_amount(p_session_id bigint, p_final_amount numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_requeue_task(p_task_id bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_retry_task(p_task_id bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_set_worker_drain(p_worker_id text, p_draining boolean, p_reason text) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_set_worker_quarantine(p_worker_id text, p_quarantined boolean, p_reason text) SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_next_task(p_worker_id text, p_worker_vram_mb integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_shutdown_slot(p_worker_id text, p_fleet_id bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_task(p_job_id text, p_worker_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_task(p_job_id text, p_worker_id text, p_worker_vram_mb integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.complete_task(p_task_id bigint, p_generation integer, p_worker_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.compute_host_usage_sessions() SET search_path = public, pg_temp;
ALTER FUNCTION public.count_active_workers(p_stale_seconds integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_job(p_job_id text, p_blend_link text, p_blend_file text) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_job_with_chunks(p_job_id text, p_blend_link text, p_blend_file text, p_total_frames integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_job_with_chunks(p_job_id text, p_blend_link text, p_blend_file text, p_total_frames integer, p_frame_start integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_task(p_job_id text, p_frame_start integer, p_frame_end integer, p_min_vram_mb integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.estimate_job_eta(p_job_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.fail_task(p_task_id bigint, p_generation integer, p_worker_id text, p_error_type text) SET search_path = public, pg_temp;
ALTER FUNCTION public.finalize_task_attempt(p_task_id bigint, p_worker_id text, p_generation integer, p_outcome text) SET search_path = public, pg_temp;
ALTER FUNCTION public.find_wake_candidates() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_fleet_capacity() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_job_render_summary(p_job_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_total_capacity() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_task_event(p_task_id bigint, p_worker_id text, p_message text) SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_stale_workers_offline() SET search_path = public, pg_temp;
ALTER FUNCTION public.register_worker(p_worker_id text, p_fleet_id bigint, p_gpu_name text, p_vram_mb integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.release_merge_lock(p_job_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.report_heartbeat(p_task_id bigint, p_generation integer, p_worker_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.report_render_speed(p_job_id text, p_seconds_per_frame numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.report_task_attempt_stage(p_task_id bigint, p_worker_id text, p_generation integer, p_stage text) SET search_path = public, pg_temp;
ALTER FUNCTION public.report_worker_crash(p_worker_id text, p_error_message text) SET search_path = public, pg_temp;
ALTER FUNCTION public.report_worker_incident(p_worker_id text, p_task_id bigint, p_event_type text, p_severity text, p_error_code text, p_summary text, p_details jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.report_worker_ready(p_task_id bigint, p_worker_id text, p_generation integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.report_worker_state_transition(p_worker_id text, p_to_state text, p_task_id bigint, p_reason text) SET search_path = public, pg_temp;
ALTER FUNCTION public.requeue_stale_tasks() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_job_total_frames(p_job_id text, p_worker_id text, p_total_frames integer, p_fps numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_worker_version(p_component text, p_new_version text) SET search_path = public, pg_temp;
ALTER FUNCTION public.start_task_attempt(p_task_id bigint, p_worker_id text, p_generation integer, p_process_started_at_epoch double precision) SET search_path = public, pg_temp;
ALTER FUNCTION public.try_acquire_merge_lock(p_job_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_task_stage(p_task_id bigint, p_generation integer, p_worker_id text, p_stage text, p_frame_num integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.worker_ping(p_worker_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_optimization_plan_if_missing(p_job_id text, p_plan jsonb) SET search_path = public, pg_temp;

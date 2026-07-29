import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OperationsQuery } from './operations-query';

type OrderRow = {
  id: string; customer_id: string; project_name: string; status: string;
  stage_progress: number; payment_status: string; internal_job_id: string | null;
  created_at: string; updated_at: string; failure_message: string | null;
  uploaded_file_b2_key: string | null; drive_link: string | null;
  duration_sec: number | null; result_size_bytes: number | null;
};
type OutputRow = { order_id: string; status: string };
type TaskRow = { job_id: string; worker_id: string | null; status: string };
type DownloadRow = { order_id: string; action: string; created_at: string };

@Injectable()
export class OperationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async overview() {
    const client = this.supabase.getClient();
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const staleCutoff = new Date(Date.now() - 60_000).toISOString();
    const count = async (column: string, values: string[]) => {
      const { count: result, error } = await client.from('render_orders')
        .select('id', { count: 'exact', head: true }).in(column, values);
      if (error) throw new Error(error.message); return result ?? 0;
    };
    const [awaitingPayment, queued, running, failed, completed, workers] = await Promise.all([
      count('payment_status', ['awaiting_transfer', 'under_review', 'underpaid', 'overpaid']),
      count('status', ['queued', 'searching_workers', 'allocating_workers']),
      count('status', ['workers_connected', 'rendering', 'packaging']),
      count('status', ['error']),
      client.from('render_orders').select('id', { count: 'exact', head: true })
        .eq('status', 'finished').gte('updated_at', today.toISOString()),
      client.from('workers').select('worker_id,last_seen_at'),
    ]);
    if (completed.error) throw new Error(completed.error.message);
    if (workers.error) throw new Error(workers.error.message);
    const workerRows = (workers.data ?? []) as { worker_id: string; last_seen_at: string | null }[];
    const onlineWorkers = workerRows.filter((w) => w.last_seen_at && w.last_seen_at >= staleCutoff).length;
    const staleWorkers = workerRows.length - onlineWorkers;
    return {
      awaitingPayment, queued, running, failed,
      completedToday: completed.count ?? 0,
      onlineWorkers, staleWorkers,
      unresolvedAlerts: failed + staleWorkers,
      alertsAreDerived: true,
      generatedAt: new Date().toISOString(),
    };
  }

  async list(query: OperationsQuery) {
    const client = this.supabase.getClient();
    const from = (query.page - 1) * query.pageSize;
    const safeSearch = query.search.replace(/[%_,()]/g, '');
    let request = client.from('render_orders').select(
      'id,customer_id,project_name,status,stage_progress,payment_status,internal_job_id,created_at,updated_at,failure_message,uploaded_file_b2_key,drive_link,duration_sec,result_size_bytes',
      { count: 'exact' },
    );
    if (safeSearch) request = request.ilike('project_name', `%${safeSearch}%`);
    if (query.jobStatus) request = request.eq('status', query.jobStatus);
    if (query.paymentStatus) request = request.eq('payment_status', query.paymentStatus);
    const { data, count, error } = await request.order('created_at', { ascending: false })
      .order('id', { ascending: false }).range(from, from + query.pageSize - 1);
    if (error) throw new Error(error.message);
    const items = await this.enrich((data ?? []) as OrderRow[]);
    return { items, page: query.page, pageSize: query.pageSize, total: count ?? 0 };
  }

  async detail(id: string) {
    const { data, error } = await this.supabase.getClient().from('render_orders').select(
      'id,customer_id,project_name,status,stage_progress,payment_status,internal_job_id,created_at,updated_at,failure_message,uploaded_file_b2_key,drive_link,duration_sec,result_size_bytes',
    ).eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('Không tìm thấy order');
    return (await this.enrich([data as OrderRow]))[0];
  }

  async timeline(orderId: string) {
    await this.detail(orderId);
    const client = this.supabase.getClient();
    const [{ data: payment }, { data: downloads, error: downloadError }] = await Promise.all([
      client.from('payments').select('id').eq('order_id', orderId).maybeSingle(),
      client.from('download_events').select('action,actor_type,created_at').eq('order_id', orderId),
    ]);
    if (downloadError) throw new Error(downloadError.message);
    let paymentEvents: { action: string; from_status: string | null; to_status: string; actor_type: string; created_at: string }[] = [];
    if (payment?.id) {
      const result = await client.from('payment_events')
        .select('action,from_status,to_status,actor_type,created_at').eq('payment_id', payment.id);
      if (result.error) throw new Error(result.error.message);
      paymentEvents = result.data ?? [];
    }
    return [
      ...paymentEvents.map((e) => ({ source: 'payment', type: e.action, from: e.from_status, to: e.to_status, actorType: e.actor_type, at: e.created_at })),
      ...((downloads ?? []) as { action: string; actor_type: string; created_at: string }[])
        .map((e) => ({ source: 'output', type: e.action, actorType: e.actor_type, at: e.created_at })),
    ].sort((a, b) => a.at.localeCompare(b.at));
  }

  private async enrich(rows: OrderRow[]) {
    if (!rows.length) return [];
    const client = this.supabase.getClient();
    const orderIds = rows.map((r) => r.id);
    const jobIds = rows.map((r) => r.internal_job_id).filter(Boolean) as string[];
    const [{ data: outputs }, { data: downloads }, tasksResult] = await Promise.all([
      client.from('outputs').select('order_id,status').in('order_id', orderIds),
      client.from('download_events').select('order_id,action,created_at').in('order_id', orderIds).eq('action', 'DOWNLOAD_REDEEMED'),
      jobIds.length ? client.from('tasks').select('job_id,worker_id,status').in('job_id', jobIds) : Promise.resolve({ data: [] }),
    ]);
    const outputMap = new Map(((outputs ?? []) as OutputRow[]).map((o) => [o.order_id, o.status]));
    const taskRows = (tasksResult.data ?? []) as TaskRow[];
    return rows.map((row) => {
      const tasks = taskRows.filter((t) => t.job_id === row.internal_job_id);
      const lastDownload = ((downloads ?? []) as DownloadRow[]).filter((d) => d.order_id === row.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.created_at ?? null;
      const attentionReasons = [row.status === 'error' ? 'job_failed' : null, row.failure_message ? 'failure_recorded' : null].filter(Boolean);
      return {
        orderId: row.id,
        customerId: row.customer_id,
        projectName: row.project_name,
        createdAt: row.created_at,
        uploadStatus: row.uploaded_file_b2_key ? 'received' : row.drive_link ? 'external_link' : 'missing',
        paymentStatus: row.payment_status,
        jobStatus: row.status,
        assignedWorker: tasks.find((t) => t.worker_id)?.worker_id ?? null,
        progressPercent: Math.round(Math.max(0, Math.min(1, row.stage_progress)) * 100),
        lastUpdatedAt: row.updated_at,
        failureReason: row.failure_message,
        outputStatus: outputMap.get(row.id) ?? 'not_ready',
        downloadedAt: lastDownload,
        durationSec: row.duration_sec,
        resultSizeBytes: row.result_size_bytes,
        attentionReasons,
      };
    });
  }
}

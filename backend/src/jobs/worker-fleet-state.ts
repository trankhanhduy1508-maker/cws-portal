export type NodeAgentState =
  | 'ONLINE'
  | 'ACTIVE_IDLE'
  | 'PREPARING'
  | 'BUSY'
  | 'RECOVERY'
  | 'OFFLINE';

export interface WorkerFleetStateInput {
  status: string | null;
  observedState: string | null;
  healthState: string | null;
  lastSeenAt: number;
  nowMs: number;
  staleAfterSeconds?: number;
}

export interface WorkerFleetStateOutput {
  online: boolean;
  nodeState: NodeAgentState;
  workerState: string | null;
  healthState: string | null;
  staleAfterSeconds: number;
}

const IDLE_STATES = new Set(['ACTIVE_IDLE', 'IDLE_WAITING_JOB', 'IDLE', 'ONLINE_AVAILABLE']);
const PREPARING_STATES = new Set(['BOOTING', 'HEALTH_CHECK', 'PREPARING', 'WORKER_START', 'RESERVED']);
const BUSY_STATES = new Set(['BUSY', 'RENDERING', 'MERGING', 'UPLOADING', 'VERIFYING', 'WORKER_RUNNING']);
const RECOVERY_STATES = new Set(['RECOVERY', 'DEGRADED', 'ERROR', 'QUARANTINED']);

export function deriveWorkerFleetState(input: WorkerFleetStateInput): WorkerFleetStateOutput {
  const staleAfterSeconds = input.staleAfterSeconds ?? 180;
  const ageMs = input.nowMs - input.lastSeenAt;
  const online = Number.isFinite(input.lastSeenAt) && ageMs >= 0 && ageMs <= staleAfterSeconds * 1000;
  const observed = (input.observedState ?? '').trim().toUpperCase();
  const status = (input.status ?? '').trim().toUpperCase();
  const health = (input.healthState ?? '').trim().toUpperCase();

  if (!online) {
    return { online: false, nodeState: 'OFFLINE', workerState: input.observedState, healthState: input.healthState, staleAfterSeconds };
  }
  if (RECOVERY_STATES.has(health) || RECOVERY_STATES.has(observed)) {
    return { online: true, nodeState: 'RECOVERY', workerState: input.observedState, healthState: input.healthState, staleAfterSeconds };
  }
  if (BUSY_STATES.has(observed) || status === 'BUSY') {
    return { online: true, nodeState: 'BUSY', workerState: input.observedState ?? input.status, healthState: input.healthState, staleAfterSeconds };
  }
  if (PREPARING_STATES.has(observed)) {
    return { online: true, nodeState: 'PREPARING', workerState: input.observedState, healthState: input.healthState, staleAfterSeconds };
  }
  if (IDLE_STATES.has(observed) || status === 'IDLE') {
    return { online: true, nodeState: 'ACTIVE_IDLE', workerState: input.observedState ?? input.status, healthState: input.healthState, staleAfterSeconds };
  }
  return { online: true, nodeState: 'ONLINE', workerState: input.observedState ?? input.status, healthState: input.healthState, staleAfterSeconds };
}

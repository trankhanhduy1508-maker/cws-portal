import { deriveWorkerFleetState } from './worker-fleet-state';

describe('deriveWorkerFleetState', () => {
  const nowMs = 1_000_000;
  const base = { status: 'idle', observedState: null, healthState: null, lastSeenAt: nowMs, nowMs };

  it('keeps a stopped/idle Worker online when Node Agent heartbeat is fresh', () => {
    expect(deriveWorkerFleetState(base)).toMatchObject({ online: true, nodeState: 'ACTIVE_IDLE' });
  });

  it('marks a stale Node Agent offline even when Worker status says idle', () => {
    expect(deriveWorkerFleetState({ ...base, lastSeenAt: nowMs - 181_000 })).toMatchObject({
      online: false,
      nodeState: 'OFFLINE',
    });
  });

  it('maps Node Agent lifecycle states', () => {
    expect(deriveWorkerFleetState({ ...base, observedState: 'PREPARING' }).nodeState).toBe('PREPARING');
    expect(deriveWorkerFleetState({ ...base, observedState: 'RENDERING', status: 'busy' }).nodeState).toBe('BUSY');
    expect(deriveWorkerFleetState({ ...base, observedState: 'RECOVERY' }).nodeState).toBe('RECOVERY');
  });
});

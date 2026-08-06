import { describe, expect, it } from 'vitest';
import { summarizeWorkers } from './fleetMetrics';

describe('summarizeWorkers', () => {
  it('maps backend online/nodeState values to fleet counters without inventing states', () => {
    expect(summarizeWorkers([
      { workerId: 'idle', online: true, nodeState: 'ACTIVE_IDLE' },
      { workerId: 'busy', online: true, nodeState: 'BUSY' },
      { workerId: 'offline', online: false, nodeState: 'OFFLINE' },
      { workerId: 'preparing', online: true, nodeState: 'PREPARING' },
    ])).toEqual({ total: 4, online: 3, offline: 1, idleSaver: 1, rendering: 1 });
  });
});

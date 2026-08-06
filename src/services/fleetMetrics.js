/** Canonical UI counters for the backend WorkerFleetState contract. */
export function summarizeWorkers(workers) {
  const online = workers.filter((worker) => worker.online);
  return {
    total: workers.length,
    online: online.length,
    offline: workers.length - online.length,
    idleSaver: online.filter((worker) => worker.nodeState === 'ACTIVE_IDLE').length,
    rendering: online.filter((worker) => worker.nodeState === 'BUSY').length,
  };
}

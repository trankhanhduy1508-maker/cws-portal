const PRODUCTION_ORIGINS = new Set(['https://cws-portal.vercel.app']);
const LOCAL_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

export function parseCorsOrigins(raw: string | undefined, nodeEnv = process.env.NODE_ENV): string[] {
  const configured = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (configured.includes('*')) throw new Error('CORS wildcard is not allowed; configure explicit origins');
  const origins = new Set(configured);
  if (nodeEnv === 'production') {
    if (origins.size === 0) throw new Error('CORS_ORIGIN(S) is required in production');
    for (const origin of origins) {
      if (!PRODUCTION_ORIGINS.has(origin)) throw new Error(`CORS origin is not an approved production origin: ${origin}`);
    }
    return [...origins];
  }
  if (origins.size === 0) return [...LOCAL_ORIGINS];
  return [...origins];
}

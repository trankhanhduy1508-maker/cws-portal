// E2E boot tests must be runnable without staging/production credentials.
// These values only satisfy config validation; no external API is contacted.
process.env.SUPABASE_URL ??= 'https://e2e.invalid.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'e2e-only-not-a-secret';
process.env.B2_ENDPOINT ??= 'https://e2e.invalid';
process.env.B2_KEY_ID ??= 'e2e-key-id';
process.env.B2_APPLICATION_KEY ??= 'e2e-only-not-a-secret';
process.env.B2_BUCKET_NAME ??= 'e2e-bucket';
process.env.CORS_ORIGINS ??= 'http://localhost:5173';

# CWS CORS Verification — 2026-08-05

## Code evidence

- `parseCorsOrigins` rejects `*`, normalizes trailing slashes, and fails closed for missing/unapproved production configuration.
- Nest is configured with a request-origin callback and `credentials: false`.
- Unit coverage verifies canonical production allow, no-origin/same-origin request, and denied origin.

## Exact deployment checklist

Owner must set on the production backend only:

```text
CORS_ORIGINS=https://cws-portal.vercel.app
```

Then run these requests against the deployed backend health/API endpoint without including credentials:

| Origin | Expected |
|---|---|
| `https://cws-portal.vercel.app` | 2xx/preflight succeeds; `Access-Control-Allow-Origin` equals that origin; no `Access-Control-Allow-Credentials: true` |
| `http://localhost:5173` | denied; no allow-origin header |
| `https://evil.example` | denied; no allow-origin header |
| no `Origin` header | server-to-server request may succeed; no credentialed CORS grant |

Staging/local may allow its explicitly configured origin list, but must reject wildcard and unlisted origins. This verification is not claimed as deployed runtime until Owner sets the environment variable and provides response evidence.

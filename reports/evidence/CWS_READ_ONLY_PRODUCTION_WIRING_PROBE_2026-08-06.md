# CWS Read-only Production Wiring Probe - 2026-08-06

## Runtime evidence

| Probe | Result |
|---|---|
| `GET https://cws-portal.vercel.app/` | HTTP 200 |
| Served Vercel JavaScript bundle | Contains `https://cws-portal.onrender.com` |
| `GET https://cws-portal.onrender.com/health` | HTTP 200, backend status JSON |
| CORS `OPTIONS /health` with Origin `https://cws-portal.vercel.app` | HTTP 204; `Access-Control-Allow-Origin` exactly matches the Vercel origin |

## Boundary

These are read-only deployment and wiring checks. No job, upload, Worker claim, B2 write, payment, migration, or production mutation was performed. They do not establish Customer-to-Worker E2E PASS.

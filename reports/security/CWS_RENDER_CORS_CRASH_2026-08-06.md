# Render production CORS crash — 2026-08-06

## Runtime evidence

Render production boot crashes in `backend/dist/common/cors-origin.util.js`:

```text
Error: CORS wildcard is not allowed; configure explicit origins
at parseCorsOrigins
at bootstrap
```

This is the intended fail-closed behavior. No wildcard bypass was added.

## Exact code/config diagnosis

`backend/src/main.ts` passes this expression to `parseCorsOrigins`:

```ts
process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN
```

Therefore the effective production configuration contains `*`. If both
variables exist, `CORS_ORIGINS` wins; if `CORS_ORIGINS` is absent, the legacy
`CORS_ORIGIN` value is used. The supplied stack trace alone cannot prove which
of those two Render environment-variable names currently contains `*`.

The repository's production contract and `.env.example` use the canonical
variable `CORS_ORIGINS`; the approved value is exactly:

```text
CORS_ORIGINS=https://cws-portal.vercel.app
```

`CORS_ORIGIN` must not remain set to `*` as a fallback. If it exists in Render,
remove it or set it to the same explicit canonical origin.

## Founder action required

In Render Dashboard → `cws-portal` service → Environment → Production:

1. Set `CORS_ORIGINS` to `https://cws-portal.vercel.app`.
2. Remove any `CORS_ORIGIN` entry whose value is `*` (prefer removing the
   legacy variable entirely).
3. Save and redeploy the service.

Do not enter `*`, comma-wildcards, or any additional unapproved origin.

## Verification gate

After redeploy, verify `/health` is HTTP 200 and a request from
`https://cws-portal.vercel.app` receives the matching
`Access-Control-Allow-Origin`. Verify an unlisted origin is denied. Until
those checks pass, Render production remains blocked and no runtime PASS is
claimed.

# CWS download expiry copy fix — 2026-08-03

## Finding

The backend signs the final download URL for `300` seconds (`5` minutes)
in `backend/src/jobs/jobs.service.ts` via `DOWNLOAD_URL_TTL_SECONDS`.
The customer download screen previously displayed `Link tải có hiệu lực
trong 3 ngày`, which contradicted the runtime behavior and the customer
research finding B5/C8.

## Change

`src/pages/PreviewDownloadScreen.jsx` now tells the customer:

> Link tải có hiệu lực trong 5 phút. Nếu hết hạn, bấm Tải thành phẩm lại để cấp link mới.

The existing backend download route signs a fresh B2 URL on every request,
so retrying the download action is the supported re-issue path. No TTL or
storage behavior was changed.

The landing page also no longer claims that files are automatically deleted
after download. No B2 cleanup/retention workflow is present in the repository,
so that deletion promise had no implementation evidence. It now describes
the verified short-lived download-link behavior instead.

## Verification

- Frontend production build: PASS (`npm run build`).
- Frontend lint: PASS (`npm run lint`).
- Backend behavior cross-checked against `JobsService.getDownloadRedirectUrl()`;
  no backend change was needed.

This is UI/copy evidence only, not full customer E2E evidence. A real
download still requires a finished paid job and valid B2/deployment
credentials.

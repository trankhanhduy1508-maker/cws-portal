# CWS AI Operating System

Version: v1.0

## Repository Structure

-   AGENTS.md
-   PROJECT_CONTEXT.md
-   CURRENT_STATUS.md
-   DECISIONS.md
-   REPORT_TEMPLATE.md
-   reports/

------------------------------------------------------------------------

# AGENTS.md

-   Mission: Build and maintain Computer Workspace (CWS).
-   Goal: Deliver MVP quickly.
-   Avoid over-engineering.
-   Work only inside the existing repository.
-   Do not create Windows worktrees.
-   Never commit secrets.
-   Run tests before commit.
-   Keep commits small.
-   Update CURRENT_STATUS.md after every task.
-   Create/update a report.

Stack: - Backend: NestJS - Frontend: React - Database: Supabase -
Storage: Backblaze B2 - Hosting: Vercel - Worker: Python

Workflow: Read CURRENT_STATUS.md → Implement → Test → Commit → Update
CURRENT_STATUS.md → Write report.

------------------------------------------------------------------------

# PROJECT_CONTEXT.md

Vision: Distributed rendering platform.

Workflow: Facebook Login → Upload → Store in B2 → Queue → Worker Render
→ Preview → Bank QR Payment → Unlock Download.

Priority: 1. Worker 2. Facebook Login 3. Payment 4. Customer MVP

------------------------------------------------------------------------

# CURRENT_STATUS.md

Worker - Heartbeat: Done - Register: Done - Upload: Done - Download:
Done - Claim Job: Done - Auto Update: Done - Runtime Test: Pending

Login - Frontend: Done - Facebook OAuth: Pending - Production Test:
Pending

Payment - Backend: Done - Auto Detect: Pending - Unlock: Pending

Next Task: Finish Facebook OAuth. Verify Worker Auto Update. Production
testing.

------------------------------------------------------------------------

# DECISIONS.md

-   Facebook Login only.
-   Vietnam Bank QR only.
-   Backblaze B2.
-   Supabase.
-   Vercel.
-   Python Worker.
-   MVP First.
-   Avoid over-engineering.
-   Android Notification Listener is research only.

------------------------------------------------------------------------

# REPORT_TEMPLATE.md

-   Summary
-   Files Changed
-   Tests
-   Build
-   Commits
-   Remaining Issues
-   Next Task

------------------------------------------------------------------------

# Daily Prompt

Read: - AGENTS.md - PROJECT_CONTEXT.md - CURRENT_STATUS.md -
DECISIONS.md

Complete the assigned task.

Rules: - Do not over-engineer. - Run tests. - Commit if tests pass. -
Push. - Update CURRENT_STATUS.md. - Update report.

Return only: Completed Remaining Commit Hash Next Task

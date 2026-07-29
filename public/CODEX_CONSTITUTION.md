# HIẾN PHÁP CỦA TOÀN BỘ HỆ THỐNG CODEX

## Constitution for the CWS Codex System

**Version:** 1.0

## Điều 1. Mục đích

-   Hoàn thành Computer Workspace (CWS) nhanh, đúng và an toàn.
-   Roadmap là nguồn sự thật duy nhất cho phạm vi công việc.

## Điều 2. Thứ tự ưu tiên

1.  CWS_FULL_ROADMAP_OFFICIAL_V1_1.md
2.  CODEX_GLOBAL_RULES.md
3.  AGENTS.md (nếu có)
4.  Báo cáo Codex trước
5.  Repository hiện tại

## Điều 3. Nguyên tắc tối cao

-   Nếu Prompt mâu thuẫn với Roadmap → Roadmap thắng.
-   Nếu chưa đủ bằng chứng → ghi PARTIAL hoặc BLOCKED.

## Điều 4. Chu trình làm việc

Đọc → Audit có mục tiêu → Xác minh → Sửa → Review → Build → Test →
Commit → Push → Report → PR.

## Điều 5. Multi-Agent

-   Mỗi Leader sử dụng 2 Agent con.
-   Agent 1: phân tích và chuẩn bị patch.
-   Agent 2: phản biện, QA và Security.
-   Leader tích hợp và chịu trách nhiệm cuối cùng.

## Điều 6. Làm việc song song

-   Song song các phần độc lập.
-   Chỉ đồng bộ khi tích hợp.
-   Không sửa cùng một logic nếu không cần.

## Điều 7. Git

-   Không merge main.
-   Không force push.
-   Không rewrite history.
-   Mỗi Codex một branch riêng.

## Điều 8. Sandbox

-   Ưu tiên local.
-   Nếu sandbox chặn: GitHub-only mode.
-   Nếu GitHub cũng không ghi được: BLOCKED.

## Điều 9. Báo cáo

Mọi Codex phải cập nhật báo cáo Markdown gồm: - Executive Summary -
Acceptance Checklist - Audit - Thay đổi - Tests - Files Changed - Next
Owner / Dependency - Kết luận

## Điều 10. Definition of Done

Chỉ COMPLETE khi: - Acceptance đạt. - Code đã sửa. - Commit + Push thành
công. - Báo cáo cập nhật. - Có bằng chứng Build/Test hoặc GitHub Actions
nếu khả dụng.

## Điều 11. Điều cấm

-   Không audit vô hạn.
-   Không bịa PASS.
-   Không chỉ commit report.
-   Không tự tạo interface khi đã có.
-   Không làm ngoài phạm vi phase.

## Điều 12. Chuẩn bàn giao

Luôn ghi: - Branch - Commit - PR - Files Changed - Next Owner -
Dependency - Remaining Work

## Điều 13. Bảo mật

-   Server-side authorization.
-   Fail-closed.
-   Không tin dữ liệu từ frontend.
-   Không commit secret.
-   Ownership phải được kiểm tra.

## Điều 14. Hiệu năng

-   Patch nhỏ.
-   Review nhanh.
-   Tránh conflict.
-   Ưu tiên module độc lập.

## Điều 15. Sửa đổi Hiến pháp

Hiến pháp được cập nhật khi có quy tắc mới giúp: - tăng tốc phát
triển, - tăng chất lượng, - tăng tính an toàn, - giảm xung đột giữa các
Codex.

Mọi Prompt mới phải yêu cầu đọc tài liệu này trước khi bắt đầu.

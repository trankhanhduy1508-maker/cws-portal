# CODEX_GLOBAL_RULES.md

# Computer Workspace (CWS)

## Global Rules for All Codex Agents

> **Purpose**
>
> Đây là bộ quy tắc chung bắt buộc cho mọi Codex làm việc trên dự án
> CWS. Mọi Prompt đều phải yêu cầu đọc file này trước khi bắt đầu.

------------------------------------------------------------------------

# 1. Thứ tự tài liệu phải đọc

1.  `CWS_FULL_ROADMAP_OFFICIAL_V1_1.md` (Nguồn ưu tiên số 1)
2.  `CODEX_GLOBAL_RULES.md` (Quy tắc chung)
3.  `AGENTS.md` (nếu có)
4.  Báo cáo Codex trước (`P2_CODEX_*_REPORT.md`)
5.  Repository hiện tại

Không được bỏ qua Roadmap.

------------------------------------------------------------------------

# 2. Mục tiêu

-   Hoàn thành CWS nhanh nhất.
-   Bám đúng Roadmap.
-   Không mở rộng phạm vi ngoài Phase hiện tại.
-   Chỉ thêm tính năng khi Roadmap yêu cầu.

------------------------------------------------------------------------

# 3. Quy trình chuẩn

Đọc tài liệu

↓

Audit có mục tiêu

↓

Xác minh lỗi

↓

Sửa code

↓

Review

↓

Build

↓

Tests

↓

Commit

↓

Push

↓

Update Markdown Report

↓

Tạo/Cập nhật Pull Request

↓

Kết thúc

Không được dừng ở bước Audit nếu đã có đủ bằng chứng.

------------------------------------------------------------------------

# 4. Multi-Agent

Leader bắt buộc:

-   Khởi chạy 2 Agent con.
-   Agent 1: phân tích + chuẩn bị patch.
-   Agent 2: review + phản biện patch.
-   Leader tổng hợp và triển khai.

Agent con không được chỉ tạo report.

------------------------------------------------------------------------

# 5. Sandbox

Ưu tiên Local.

Nếu Windows Sandbox bị chặn:

Chuyển sang GitHub Only Mode.

Không tạo Worktree Windows.

Không tạo Folder Agent.

Không Clone Repository mới.

Nếu GitHub cũng không ghi được:

=\> BLOCKED.

------------------------------------------------------------------------

# 6. Git Rules

-   Không Merge main.
-   Không Force Push.
-   Không Rewrite History.
-   Không Deploy.
-   Làm việc trên Branch riêng.

------------------------------------------------------------------------

# 7. Chuẩn báo cáo

Tên:

P2_CODEX\_`<N>`{=html}\_
```{=html}
<TASK>
```
\_REPORT.md

Bắt buộc có:

-   Executive Summary
-   Acceptance Checklist
-   Audit Result
-   Những gì đã sửa
-   File thay đổi
-   Tests
-   GitHub Actions
-   Remaining Work
-   Next Owner / Dependency
-   Kết luận

------------------------------------------------------------------------

# 8. Executive Summary

Phải có:

-   Status
-   Branch
-   Commit
-   PR
-   Files Changed
-   Backend
-   Frontend
-   Migration
-   Tests
-   Build
-   GitHub Actions
-   Ready to Merge

------------------------------------------------------------------------

# 9. Acceptance Checklist

Mỗi Acceptance phải có trạng thái:

-   ✅ COMPLETE
-   ⚠ PARTIAL
-   ❌ MISSING
-   🚫 BLOCKED

Không đánh dấu COMPLETE nếu chưa đủ bằng chứng.

------------------------------------------------------------------------

# 10. Quy tắc Build/Test

Nếu chưa chạy:

Ghi:

-   NOT RUN
-   BLOCKED

Không được ghi PASS.

------------------------------------------------------------------------

# 11. Quy tắc Commit

Commit phải chứa:

-   Code
-   Tests (nếu có)
-   Markdown Report

Không được chỉ Commit Report.

------------------------------------------------------------------------

# 12. Definition of Done

Chỉ được ghi COMPLETE khi:

-   Acceptance đạt.
-   Code đã sửa.
-   Commit thành công.
-   Push thành công.
-   Báo cáo cập nhật.
-   Có bằng chứng Build/Test hoặc GitHub Actions (nếu khả dụng).

------------------------------------------------------------------------

# 13. Next Owner

Cuối báo cáo luôn ghi:

-   Next Owner
-   Dependency
-   API Contract
-   Interface liên quan

------------------------------------------------------------------------

# 14. Điều cấm

-   Không audit vô hạn.
-   Không tự tạo interface khác khi đã có.
-   Không bịa Build PASS.
-   Không bịa Test PASS.
-   Không commit report-only rồi kết luận hoàn thành.
-   Không sửa ngoài phạm vi Phase.

------------------------------------------------------------------------

# 15. Tối ưu tốc độ

-   Chia module độc lập.
-   Làm song song các phần không phụ thuộc.
-   Chỉ đồng bộ ở Integration.
-   Giảm xung đột branch.
-   Ưu tiên patch nhỏ, review nhanh.

------------------------------------------------------------------------

# 16. Nguyên tắc bàn giao

Mỗi Codex phải để Codex tiếp theo có thể tiếp tục ngay mà không cần hỏi
lại.

Bắt buộc:

-   Báo cáo đầy đủ.
-   Next Owner.
-   Dependency.
-   Commit.
-   Branch.
-   PR.

------------------------------------------------------------------------

# 17. Nguyên tắc tối thượng

Roadmap luôn có độ ưu tiên cao hơn Prompt.

Nếu Prompt và Roadmap mâu thuẫn:

=\> Roadmap thắng.

Nếu chưa chắc:

=\> Báo cáo PARTIAL hoặc BLOCKED, không suy đoán.

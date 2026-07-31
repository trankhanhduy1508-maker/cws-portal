package com.cws.paymentlistener.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Trạng thái 1 sự kiện trong hàng đợi cục bộ (PHẦN 2.4). */
object EventStatus {
    const val PENDING = "pending"
    const val SENT = "sent"
    const val REJECTED = "rejected"
    const val FAILED = "failed"

    /** PHẦN 6: "khi chưa chắc chắn hoặc parse lỗi — không gửi, lưu raw để
     * kiểm tra thủ công". NotificationParser không tách được amount/
     * transfer_content tối thiểu -> event dừng ở đây, SyncWorker KHÔNG
     * tự gửi (khác PENDING, không nằm trong getSendable()). Vẫn xem được
     * đầy đủ raw qua màn hình trạng thái để hiệu chỉnh NotificationParser
     * (PHẦN 3) hoặc gửi thủ công sau. */
    const val NEEDS_REVIEW = "needs_review"
}

/**
 * 1 dòng = 1 thông báo MBBank ĐÃ BẮT ĐƯỢC (PHẦN 2.1/2.4). Luôn lưu
 * NGUYÊN VẸN raw data trước, parse là bước RIÊNG có thể sai — không bao
 * giờ mất dữ liệu gốc dù parse thất bại (PHẦN 3: mục tiêu quan trọng
 * nhất là dump đúng định dạng thật để hiệu chỉnh parser sau).
 */
@Entity(tableName = "events")
data class EventEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    /** Event ID cục bộ (UUID, PHẦN 2.1) — fingerprint chống gửi trùng
     * CỦA CHÍNH điện thoại (khác transaction_id ngân hàng, có thể null
     * nếu parser không tách được). */
    val localEventId: String,

    val packageName: String,
    val postTime: Long,
    val capturedAt: Long,

    val title: String?,
    val text: String?,
    val subText: String?,
    val bigText: String?,
    /** Toàn bộ extras Bundle đã chuyển an toàn sang JSON string (PHẦN 3). */
    val extrasJson: String,

    /** Kết quả NotificationParser (best-effort, xem NotificationParser.kt)
     * — null nghĩa là KHÔNG tách được, không có nghĩa là "không phải giao
     * dịch". transactionId null thì gửi backend bằng localEventId thay
     * thế (xem SyncWorker) để vẫn có 1 khoá chống trùng, dù không phải
     * mã giao dịch ngân hàng thật. */
    val parsedTransactionId: String?,
    val parsedAmount: Long?,
    val parsedTransferContent: String?,

    val status: String = EventStatus.PENDING,
    val attempts: Int = 0,
    val lastAttemptAt: Long? = null,
    val lastError: String? = null,
    val backendPaymentId: String? = null,
    val backendStatus: String? = null,
)

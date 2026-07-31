package com.cws.paymentlistener.notification

/** Kết quả parse — MỌI field đều nullable, KHÔNG có field nào "chắc
 * chắn đúng". `confident` chỉ true khi tách được CẢ amount LẪN đúng
 * định dạng "CWS ..." trong nội dung — đây là ngưỡng tối thiểu để đáng
 * gửi lên Backend (Backend vẫn tự đối chiếu lại toàn bộ, đây chỉ là gợi
 * ý cho UI hiển thị "có vẻ hợp lệ" hay không). */
data class ParsedTransaction(
    val bankTransactionId: String?,
    val amountVnd: Long?,
    val transferContent: String?,
    val confident: Boolean,
)

/**
 * PHẦN 3/4 — "KHÔNG được vội viết regex dựa trên suy đoán": các pattern
 * dưới đây là ƯỚC LƯỢNG BAN ĐẦU dựa trên định dạng thông báo chuyển
 * khoản phổ biến của ngân hàng Việt Nam nói chung (không phải xác nhận
 * từ mẫu MBBank thật — xem reports/payments/MBBANK_NOTIFICATION_LISTENER_RESEARCH.md,
 * mục 4: "không tìm được mẫu chính xác, cần thiết bị thật để dump").
 *
 * THIẾT KẾ CÓ CHỦ Ý ĐỂ DỄ HIỆU CHỈNH: mọi regex khai báo ở TOP của object
 * này (không rải rác trong hàm) — sau khi có mẫu thật từ PHẦN 3 (dump
 * events.extrasJson/bigText qua màn hình trạng thái > "Sao chép raw
 * notification"), CHỈ cần sửa các hằng số Regex bên dưới, KHÔNG cần sửa
 * logic gọi hàm ở NotificationListenerService/SyncWorker.
 *
 * Parse THẤT BẠI không chặn việc gửi lên Backend (nguyên tắc PHẦN "Điện
 * thoại không được tự quyết định giao dịch thành công" — Backend mới là
 * nơi quyết định) — SyncWorker vẫn gửi transfer_content thô (title+text+
 * bigText nối lại) nếu parser không tách được đoạn "CWS ..." riêng,
 * Backend tự regex lại và reject rõ ràng nếu không khớp.
 */
object NotificationParser {
    /** Số tiền: "+1,234,567 VND", "+1.234.567đ", "1234567 VND"... — chấp
     * nhận dấu phẩy/chấm ngăn cách hàng nghìn, có/không dấu +. */
    private val AMOUNT_REGEX = Regex("""[+]?([\d]{1,3}(?:[.,]\d{3})+|\d+)\s?(?:VND|vnd|đ|VNĐ)""")

    /** Đúng định dạng CWS đã thiết kế (backend/src/payments/payments.service.ts,
     * matchAndConfirm): "CWS {storage_code} {payment_code}". */
    private val CWS_CONTENT_REGEX = Regex("""CWS\s+\S+\s+[A-Za-z0-9]+""")

    /** Mã giao dịch ngân hàng — ước lượng theo tiền tố phổ biến (FT.../
     * "Ma GD"/"Ref") của liên ngân hàng Việt Nam nói chung. CẦN xác nhận
     * lại bằng mẫu MBBank thật (PHẦN 3) — nếu sai, bankTransactionId sẽ
     * null và SyncWorker tự dùng localEventId thay thế, KHÔNG chặn gửi. */
    private val BANK_TXN_ID_REGEX = Regex(
        """(?:Ref|Ma\s*GD|GD\s*so|Transaction\s*ID)\s*[:#]?\s*([A-Za-z0-9]{6,})""",
        RegexOption.IGNORE_CASE,
    )
    private val FT_CODE_REGEX = Regex("""\bFT\d{6,}\b""")

    fun parse(title: String?, text: String?, subText: String?, bigText: String?): ParsedTransaction {
        val combined = listOfNotNull(title, text, subText, bigText).joinToString(" \n ")

        val amount = AMOUNT_REGEX.find(combined)
            ?.groupValues?.get(1)
            ?.replace(".", "")
            ?.replace(",", "")
            ?.toLongOrNull()

        val transferContent = CWS_CONTENT_REGEX.find(combined)?.value

        val bankTransactionId = BANK_TXN_ID_REGEX.find(combined)?.groupValues?.get(1)
            ?: FT_CODE_REGEX.find(combined)?.value

        return ParsedTransaction(
            bankTransactionId = bankTransactionId,
            amountVnd = amount,
            transferContent = transferContent,
            confident = amount != null && transferContent != null,
        )
    }
}

package com.cws.paymentlistener.data.remote

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * PHẦN 5 — ký request HMAC-SHA256, PHẢI khớp CHÍNH XÁC cách Backend tính
 * lại chữ ký (backend/src/common/guards/device-signature.guard.ts +
 * device-heartbeat.guard.ts) — đổi canonical string ở 1 bên mà không đổi
 * bên kia sẽ khiến MỌI request bị từ chối 401.
 *
 * GIỚI HẠN ĐÃ GHI RÕ (không giả vờ an toàn tuyệt đối): DEVICE_SECRET nằm
 * trong BuildConfig của APK vẫn có thể bị trích xuất qua decompile — đây
 * là bảo mật mức MVP, đủ chặn request ngẫu nhiên không biết secret,
 * KHÔNG chống được kẻ tấn công đã có quyền truy cập vật lý/root vào
 * chính điện thoại đăng ký.
 */
object RequestSigner {
    private const val ALGORITHM = "HmacSHA256"

    fun hmacHex(secret: String, canonical: String): String {
        val mac = Mac.getInstance(ALGORITHM)
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), ALGORITHM))
        val bytes = mac.doFinal(canonical.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    /** Canonical CHO /payment/notification — khớp DeviceSignatureGuard:
     * `${deviceId}.${timestamp}.${transaction_id}.${amount}.${transfer_content}`. */
    fun notificationCanonical(
        deviceId: String,
        timestamp: Long,
        transactionId: String,
        amountVnd: Long,
        transferContent: String,
    ): String = listOf(deviceId, timestamp.toString(), transactionId, amountVnd.toString(), transferContent)
        .joinToString(".")

    /** Canonical CHO /payment/device/heartbeat — khớp DeviceHeartbeatGuard:
     * `${deviceId}.${timestamp}` (KHÔNG có dữ liệu tài chính). */
    fun heartbeatCanonical(deviceId: String, timestamp: Long): String = "$deviceId.$timestamp"
}

package com.cws.paymentlistener.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.cws.paymentlistener.BuildConfig
import com.cws.paymentlistener.data.local.AppDatabase
import com.cws.paymentlistener.data.local.EventEntity
import com.cws.paymentlistener.data.local.EventStatus
import com.cws.paymentlistener.data.remote.BackendApi
import com.cws.paymentlistener.data.remote.HttpResult
import com.cws.paymentlistener.device.DeviceIdentity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/**
 * PHẦN 2.4 — gửi các event PENDING/FAILED lên Backend. WorkManager tự lo
 * exponential backoff giữa các LẦN WORKER CHẠY (cấu hình lúc enqueue,
 * xem MbBankNotificationListenerService + HeartbeatWorker), worker này
 * chỉ lo xử lý ĐÚNG 1 lượt hiện có — KHÔNG tự vòng lặp/sleep bên trong
 * (đúng khuyến nghị WorkManager, tránh giữ wakelock quá lâu).
 */
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        const val IMMEDIATE_WORK_NAME = "sync_immediate"
        const val PERIODIC_WORK_NAME = "sync_periodic"
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val baseUrl = BuildConfig.BACKEND_BASE_URL
        val secret = BuildConfig.DEVICE_SECRET
        if (baseUrl.isBlank() || secret.isBlank()) {
            // Chưa cấu hình local.properties (PHẦN 5) — không có gì để làm,
            // KHÔNG phải lỗi tạm thời nên không cần retry liên tục.
            return@withContext Result.failure()
        }

        val dao = AppDatabase.get(applicationContext).eventDao()
        val deviceId = DeviceIdentity.getOrCreateDeviceId(applicationContext)
        val pending = dao.getSendable()

        // PHẦN 6 — CAPTURE_ONLY: build chưa bật cws.payment.enabled=true thì
        // KHÔNG BAO GIỜ gọi /payment/notification, dù đã parse hợp lệ. Sự
        // kiện vẫn nằm nguyên trong Room (KHÔNG mất), chỉ chờ tới khi bật cờ.
        if (!BuildConfig.PAYMENT_ENABLED) {
            return@withContext Result.success()
        }

        var hadTransientFailure = false

        for (event in pending) {
            val result = BackendApi.sendNotification(baseUrl, deviceId, secret, event)
            val updated = applyResult(event, result)
            dao.update(updated)
            if (updated.status == EventStatus.FAILED) hadTransientFailure = true
        }

        // Còn lỗi tạm thời (mạng/429/5xx) -> Result.retry() để WorkManager tự
        // backoff (EXPONENTIAL, cấu hình lúc enqueue) rồi thử lại nguyên lượt.
        if (hadTransientFailure) Result.retry() else Result.success()
    }

    private fun applyResult(event: EventEntity, result: HttpResult): EventEntity {
        val now = System.currentTimeMillis()
        val baseUpdate = event.copy(attempts = event.attempts + 1, lastAttemptAt = now)

        if (result.isNetworkError) {
            return baseUpdate.copy(status = EventStatus.FAILED, lastError = "Lỗi mạng: ${result.networkError}")
        }

        if (result.isSuccess) {
            val body = result.body?.let { runCatching { JSONObject(it) }.getOrNull() }
            return baseUpdate.copy(
                status = EventStatus.SENT,
                lastError = null,
                backendPaymentId = body?.optString("paymentId")?.takeIf { it.isNotBlank() && it != "null" },
                backendStatus = body?.optString("status"),
            )
        }

        // Backend đã trả lời (không phải lỗi mạng) — phân biệt loại lỗi:
        // 401 (chữ ký/thiết bị) và 429 (rate limit) có thể TỰ hết sau khi
        // đồng hồ/điều kiện đổi -> đáng thử lại. 400/403/404 là Backend đã
        // TỪ CHỐI RÕ RÀNG dữ liệu này (sai số tiền/không tìm thấy payment...)
        // -> gửi lại y hệt cũng vô nghĩa, đánh dấu REJECTED vĩnh viễn.
        val message = extractErrorMessage(result.body) ?: "HTTP ${result.code}"
        return if (result.code == 401 || result.code == 429 || result.code >= 500) {
            baseUpdate.copy(status = EventStatus.FAILED, lastError = message)
        } else {
            baseUpdate.copy(status = EventStatus.REJECTED, lastError = message)
        }
    }

    private fun extractErrorMessage(body: String?): String? {
        if (body == null) return null
        return runCatching { JSONObject(body).optString("message").takeIf { it.isNotBlank() } }.getOrNull()
    }
}

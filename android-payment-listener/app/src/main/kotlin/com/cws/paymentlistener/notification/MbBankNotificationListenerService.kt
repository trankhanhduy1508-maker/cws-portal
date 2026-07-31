package com.cws.paymentlistener.notification

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.cws.paymentlistener.data.local.AppDatabase
import com.cws.paymentlistener.data.local.EventEntity
import com.cws.paymentlistener.data.local.EventStatus
import com.cws.paymentlistener.work.SyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * PHẦN 2.1 — CHỈ xử lý package com.mbmobile, KHÔNG dùng Root/Accessibility
 * Service/OCR/tự động click (đúng nguyên tắc đã ghi trong yêu cầu).
 *
 * Đăng ký "Notification access" thủ công bởi người dùng qua Settings
 * (KHÔNG phải runtime permission thường) — xem MainActivity.openNotificationAccessSettings().
 */
class MbBankNotificationListenerService : NotificationListenerService() {

    private val scope = CoroutineScope(Dispatchers.IO)

    companion object {
        private const val TAG = "MbBankListener"

        /** Package MBBank thật, xác nhận qua Google Play (không đoán) —
         * xem reports/payments/MBBANK_NOTIFICATION_LISTENER_RESEARCH.md, mục 3. */
        const val MBBANK_PACKAGE = "com.mbmobile"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        // "không đọc thông báo của app khác vào hệ thống thanh toán" — lọc
        // NGAY từ đầu, không xử lý gì thêm cho package khác.
        if (sbn.packageName != MBBANK_PACKAGE) return

        val notification: Notification = sbn.notification ?: return
        val extras = notification.extras

        val title = extras?.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        val text = extras?.getCharSequence(Notification.EXTRA_TEXT)?.toString()
        val subText = extras?.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()
        val bigText = extras?.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
        val extrasJson = NotificationExtrasReader.toSafeJson(extras)

        val parsed = NotificationParser.parse(title, text, subText, bigText)

        Log.i(TAG, "Nhận notification MBBank lúc ${sbn.postTime}, confident=${parsed.confident}")

        val event = EventEntity(
            localEventId = UUID.randomUUID().toString(),
            packageName = sbn.packageName,
            postTime = sbn.postTime,
            capturedAt = System.currentTimeMillis(),
            title = title,
            text = text,
            subText = subText,
            bigText = bigText,
            extrasJson = extrasJson.toString(),
            parsedTransactionId = parsed.bankTransactionId,
            parsedAmount = parsed.amountVnd,
            parsedTransferContent = parsed.transferContent,
            // Thiếu amount HOẶC transfer_content (2 field bắt buộc phía
            // Backend, xem MbbankNotificationDto) -> KHÔNG tự gửi, chờ
            // xem xét thủ công (PHẦN 6).
            status = if (parsed.amountVnd != null && parsed.transferContent != null) {
                EventStatus.PENDING
            } else {
                EventStatus.NEEDS_REVIEW
            },
        )

        scope.launch {
            AppDatabase.get(applicationContext).eventDao().insert(event)
            // Đẩy sync ngay (best-effort) — nếu mất mạng, SyncWorker định kỳ
            // (WorkManager, PHẦN 2.4) sẽ tự thử lại sau, KHÔNG mất sự kiện.
            val request = OneTimeWorkRequestBuilder<SyncWorker>().build()
            WorkManager.getInstance(applicationContext)
                .enqueueUniqueWork(SyncWorker.IMMEDIATE_WORK_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Không cần xử lý — chỉ quan tâm lúc notification XUẤT HIỆN.
    }
}

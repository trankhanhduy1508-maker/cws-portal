package com.cws.paymentlistener.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.cws.paymentlistener.BuildConfig
import com.cws.paymentlistener.data.local.AppDatabase
import com.cws.paymentlistener.data.remote.BackendApi
import com.cws.paymentlistener.device.DeviceIdentity
import com.cws.paymentlistener.device.DeviceInfoProvider
import com.cws.paymentlistener.device.PermissionStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/**
 * PHẦN 2.5 — heartbeat định kỳ (15 phút, mức tối thiểu WorkManager
 * PeriodicWorkRequest cho phép — Android KHÔNG hỗ trợ chu kỳ ngắn hơn
 * cho periodic work, đây là giới hạn hệ thống chứ không phải lựa chọn
 * tuỳ ý). CHỈ gửi metadata thiết bị/trạng thái app — KHÔNG IMEI/serial/
 * danh bạ/SMS/vị trí (đúng yêu cầu).
 */
class HeartbeatWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        const val PERIODIC_WORK_NAME = "heartbeat_periodic"
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val baseUrl = BuildConfig.BACKEND_BASE_URL
        val secret = BuildConfig.DEVICE_SECRET
        if (baseUrl.isBlank() || secret.isBlank()) return@withContext Result.failure()

        val deviceId = DeviceIdentity.getOrCreateDeviceId(applicationContext)
        val latestEvent = AppDatabase.get(applicationContext).eventDao().getLatest()

        val payload = JSONObject().apply {
            put("manufacturer", DeviceInfoProvider.manufacturer)
            put("model", DeviceInfoProvider.model)
            put("android_version", DeviceInfoProvider.androidVersion)
            put("app_version", BuildConfig.VERSION_NAME)
            put("notification_listener_enabled", PermissionStatus.isNotificationAccessGranted(applicationContext))
            put("battery_optimization_ignored", PermissionStatus.isIgnoringBatteryOptimizations(applicationContext))
            latestEvent?.lastError?.let { put("last_error", it) }
        }

        val result = BackendApi.sendHeartbeat(baseUrl, deviceId, secret, payload)
        if (result.isSuccess) Result.success() else if (result.isNetworkError) Result.retry() else Result.failure()
    }
}

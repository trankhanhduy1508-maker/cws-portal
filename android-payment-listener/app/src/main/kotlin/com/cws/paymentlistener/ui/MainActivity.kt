package com.cws.paymentlistener.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.cws.paymentlistener.BuildConfig
import com.cws.paymentlistener.data.local.AppDatabase
import com.cws.paymentlistener.data.local.EventEntity
import com.cws.paymentlistener.data.remote.BackendApi
import com.cws.paymentlistener.databinding.ActivityMainBinding
import com.cws.paymentlistener.device.DeviceIdentity
import com.cws.paymentlistener.device.DeviceInfoProvider
import com.cws.paymentlistener.device.OemGuideProvider
import com.cws.paymentlistener.device.PermissionStatus
import com.cws.paymentlistener.work.SyncWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** PHẦN 2.2 — màn hình trạng thái MVP tối thiểu. KHÔNG dùng Jetpack
 * Compose (ưu tiên cấu trúc nhỏ/dễ build — XML layout chuẩn, ít phụ
 * thuộc Gradle hơn, dễ mở bằng Android Studio ngay lần đầu). */
class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale("vi", "VN"))

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        bindStaticDeviceInfo()
        bindActions()
    }

    override fun onResume() {
        super.onResume()
        // Quyền/trạng thái có thể vừa đổi ở màn Cài đặt (Notification
        // Access/Pin) — refresh mỗi lần quay lại app, không chỉ lúc mở lần đầu.
        refreshStatus()
    }

    private fun bindStaticDeviceInfo() {
        binding.tvDeviceId.text = "Device ID: ${DeviceIdentity.getOrCreateDeviceId(this)}"
        binding.tvManufacturer.text = "Hãng: ${DeviceInfoProvider.manufacturer} (${DeviceInfoProvider.brand})"
        binding.tvModel.text = "Model: ${DeviceInfoProvider.model}"
        binding.tvAndroidVersion.text = "Android: ${DeviceInfoProvider.androidVersion}"
        binding.tvSdkVersion.text = "SDK: ${DeviceInfoProvider.sdkInt}"
        binding.tvAppVersion.text = "Phiên bản app: ${BuildConfig.VERSION_NAME}"
    }

    private fun refreshStatus() {
        val notifAccess = PermissionStatus.isNotificationAccessGranted(this)
        binding.tvNotificationAccess.text =
            "Notification Access: ${if (notifAccess) "✅ Đã cấp" else "❌ CHƯA cấp — bấm nút bên dưới"}"

        val postNotif = PermissionStatus.isPostNotificationsGranted(this)
        binding.tvPostNotificationPermission.text =
            "Quyền hiện thông báo (Android 13+): ${if (postNotif) "✅ Đã cấp" else "❌ Chưa cấp"}"

        val batteryOk = PermissionStatus.isIgnoringBatteryOptimizations(this)
        binding.tvBatteryOptimization.text =
            "Tối ưu hoá pin: ${if (batteryOk) "✅ Đã bỏ qua (an toàn)" else "⚠️ CHƯA bỏ qua — có thể bị kill nền"}"

        binding.tvBackendConnection.text = "Backend: ${
            if (BuildConfig.BACKEND_BASE_URL.isBlank()) "❌ CHƯA cấu hình (xem local.properties)"
            else "Đã cấu hình: ${BuildConfig.BACKEND_BASE_URL}"
        }"
        binding.tvPaymentMode.text = if (BuildConfig.PAYMENT_ENABLED) {
            "⚠️ CHẾ ĐỘ: PAYMENT_ENABLED — sự kiện hợp lệ SẼ được gửi để xử lý thanh toán thật"
        } else {
            "🔒 CHẾ ĐỘ: CAPTURE_ONLY — chỉ ghi nhận/parse cục bộ, KHÔNG gửi thanh toán"
        }

        lifecycleScope.launch {
            val dao = AppDatabase.get(applicationContext).eventDao()
            val latest = withContext(Dispatchers.IO) { dao.getLatest() }
            val pendingCount = withContext(Dispatchers.IO) { dao.countPending() }

            binding.tvPendingCount.text = "Sự kiện đang chờ gửi: $pendingCount"

            if (latest == null) {
                binding.tvLastNotification.text = "Thông báo MBBank gần nhất: chưa từng nhận"
                binding.tvLastSyncResult.text = "Kết quả gửi backend gần nhất: —"
                binding.tvLastRawContent.text = "(chưa có dữ liệu)"
            } else {
                binding.tvLastNotification.text =
                    "Thông báo MBBank gần nhất: ${dateFormat.format(Date(latest.capturedAt))}"
                binding.tvLastSyncResult.text = buildString {
                    append("Kết quả gửi backend gần nhất: ${latest.status}")
                    if (latest.lastError != null) append(" — ${latest.lastError}")
                }
                binding.tvLastRawContent.text = formatRawContent(latest)
            }
        }

        // Heartbeat gần nhất KHÔNG lưu local (Backend là nguồn sự thật cho
        // Admin Dashboard) — hiện thời điểm app tự lưu lần gửi heartbeat
        // gần nhất do CHÍNH app biết (đơn giản hoá: dùng SharedPreferences
        // qua HeartbeatWorker sẽ phức tạp hoá MVP; hiện tại hiển thị nhắc
        // xem Admin Dashboard để có số liệu chính xác từ Backend).
        binding.tvLastHeartbeat.text = "Heartbeat: xem chính xác tại Admin Dashboard (CWS Portal)"
    }

    private fun formatRawContent(event: EventEntity): String = buildString {
        appendLine("title: ${event.title}")
        appendLine("text: ${event.text}")
        appendLine("subText: ${event.subText}")
        appendLine("bigText: ${event.bigText}")
        appendLine("extras: ${event.extrasJson}")
        appendLine("parsed.transactionId: ${event.parsedTransactionId}")
        appendLine("parsed.amount: ${event.parsedAmount}")
        append("parsed.transferContent: ${event.parsedTransferContent}")
    }

    private fun bindActions() {
        binding.btnOpenNotificationAccess.setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        binding.btnOpenNotificationSettings.setOnClickListener {
            val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
            try {
                startActivity(intent)
            } catch (_: Exception) {
                startActivity(
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")),
                )
            }
        }

        binding.btnOpenBatterySettings.setOnClickListener {
            val guide = OemGuideProvider.guideFor(this, DeviceInfoProvider.manufacturer)
            Toast.makeText(this, "${guide.brandLabel}: ${guide.instructions}", Toast.LENGTH_LONG).show()
            OemGuideProvider.openSettingsWithFallback(this, guide)
        }

        binding.btnCheckBackend.setOnClickListener {
            lifecycleScope.launch {
                Toast.makeText(this@MainActivity, "Đang kiểm tra...", Toast.LENGTH_SHORT).show()
                val deviceId = DeviceIdentity.getOrCreateDeviceId(this@MainActivity)
                val result = withContext(Dispatchers.IO) {
                    BackendApi.sendHeartbeat(
                        BuildConfig.BACKEND_BASE_URL,
                        deviceId,
                        BuildConfig.DEVICE_SECRET,
                        org.json.JSONObject(),
                    )
                }
                val message = when {
                    result.isSuccess -> "✅ Kết nối Backend OK"
                    result.isNetworkError -> "❌ Lỗi mạng: ${result.networkError}"
                    else -> "❌ Backend từ chối (HTTP ${result.code}) — kiểm tra device_id/secret đã đăng ký đúng chưa"
                }
                Toast.makeText(this@MainActivity, message, Toast.LENGTH_LONG).show()
            }
        }

        binding.btnResendPending.setOnClickListener {
            val request = OneTimeWorkRequestBuilder<SyncWorker>().build()
            WorkManager.getInstance(applicationContext)
                .enqueueUniqueWork(SyncWorker.IMMEDIATE_WORK_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
            val message = if (BuildConfig.PAYMENT_ENABLED) {
                "Đã yêu cầu gửi lại — xem kết quả sau vài giây"
            } else {
                "Đang ở chế độ CAPTURE_ONLY — sự kiện KHÔNG được gửi đi (chỉ ghi nhận cục bộ)"
            }
            Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        }

        binding.btnClearLog.setOnClickListener {
            lifecycleScope.launch {
                withContext(Dispatchers.IO) { AppDatabase.get(applicationContext).eventDao().clearAll() }
                Toast.makeText(this@MainActivity, "Đã xoá log cục bộ", Toast.LENGTH_SHORT).show()
                refreshStatus()
            }
        }

        binding.btnCopyRaw.setOnClickListener {
            lifecycleScope.launch {
                val latest = withContext(Dispatchers.IO) {
                    AppDatabase.get(applicationContext).eventDao().getLatest()
                }
                if (latest == null) {
                    Toast.makeText(this@MainActivity, "Chưa có dữ liệu để sao chép", Toast.LENGTH_SHORT).show()
                    return@launch
                }
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                clipboard.setPrimaryClip(ClipData.newPlainText("raw_notification", formatRawContent(latest)))
                Toast.makeText(this@MainActivity, "Đã sao chép raw notification", Toast.LENGTH_SHORT).show()
            }
        }
    }
}

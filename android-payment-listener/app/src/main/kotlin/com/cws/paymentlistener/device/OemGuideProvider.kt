package com.cws.paymentlistener.device

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings

data class OemGuide(val brandLabel: String, val instructions: String, val settingsIntent: Intent?)

/**
 * PHẦN 2.3 — hướng dẫn theo TỪNG hãng (dựa theo Build.MANUFACTURER THẬT
 * lúc chạy, KHÔNG hardcode máy cụ thể của ai). Intent OEM đôi khi KHÔNG
 * tồn tại trên 1 số bản ROM/phiên bản cụ thể (activity không tồn tại) —
 * MainActivity PHẢI bắt ActivityNotFoundException và rơi về màn hình cài
 * đặt app gần nhất (ACTION_APPLICATION_DETAILS_SETTINGS) + hiện hướng
 * dẫn thủ công, "không giả vờ đã bật thành công" (yêu cầu PHẦN 2.3).
 */
object OemGuideProvider {
    fun guideFor(context: Context, manufacturer: String): OemGuide {
        val m = manufacturer.lowercase()
        val pkg = context.packageName

        return when {
            "xiaomi" in m || "redmi" in m || "poco" in m -> OemGuide(
                brandLabel = "Xiaomi / Redmi / POCO (MIUI/HyperOS)",
                instructions = "Cài đặt > Ứng dụng > Quản lý ứng dụng > CWS Payment Listener > " +
                    "Bật \"Tự khởi động\" (Autostart) VÀ đặt \"Tiết kiệm pin\" = \"Không hạn chế\". " +
                    "MIUI hay RESET lại quyền này sau mỗi lần cập nhật OTA — kiểm tra định kỳ.",
                settingsIntent = Intent().setClassName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.autostart.AutoStartManagementActivity",
                ),
            )
            "samsung" in m -> OemGuide(
                brandLabel = "Samsung",
                instructions = "Cài đặt > Chăm sóc pin và thiết bị > Pin > Giới hạn nền cho ứng dụng > " +
                    "gỡ CWS Payment Listener khỏi danh sách \"Ngủ đông\"/\"Chưa dùng\".",
                settingsIntent = intentAppBatterySettings(pkg),
            )
            "oppo" in m -> OemGuide(
                brandLabel = "OPPO (ColorOS)",
                instructions = "Cài đặt > Pin > Tối ưu hoá pin ứng dụng > CWS Payment Listener > \"Không tối ưu hoá\". " +
                    "Kiểm tra thêm mục Quản lý khởi động (Autostart) trong ColorOS Bảo mật.",
                settingsIntent = Intent().setClassName(
                    "com.coloros.safecenter",
                    "com.coloros.safecenter.permission.startup.StartupAppListActivity",
                ),
            )
            "realme" in m -> OemGuide(
                brandLabel = "Realme",
                instructions = "Cài đặt > Pin > Tối ưu hoá pin ứng dụng > CWS Payment Listener > \"Không tối ưu hoá\". " +
                    "Kiểm tra thêm Quản lý ứng dụng khởi động cùng hệ thống.",
                settingsIntent = Intent().setClassName(
                    "com.coloros.safecenter",
                    "com.coloros.safecenter.permission.startup.StartupAppListActivity",
                ),
            )
            "vivo" in m -> OemGuide(
                brandLabel = "Vivo (Funtouch OS)",
                instructions = "Cài đặt > Pin > Sử dụng nền cao > cho phép CWS Payment Listener chạy nền. " +
                    "Cài đặt > Ứng dụng > Quản lý tự khởi động > bật cho app này.",
                settingsIntent = intentAppBatterySettings(pkg),
            )
            "huawei" in m -> OemGuide(
                brandLabel = "Huawei (EMUI)",
                instructions = "Cài đặt > Pin > Khởi chạy ứng dụng > CWS Payment Listener > chuyển sang " +
                    "\"Quản lý thủ công\", bật cả 3: Tự khởi động, Khởi động cùng ứng dụng khác, Chạy nền.",
                settingsIntent = Intent().setClassName(
                    "com.huawei.systemmanager",
                    "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
                ),
            )
            "honor" in m -> OemGuide(
                brandLabel = "Honor (MagicOS)",
                instructions = "Cài đặt > Pin > Khởi chạy ứng dụng > CWS Payment Listener > \"Quản lý thủ công\", " +
                    "bật Tự khởi động + Chạy nền.",
                settingsIntent = intentAppBatterySettings(pkg),
            )
            else -> OemGuide(
                brandLabel = "Android gần chuẩn / hãng khác ($manufacturer)",
                instructions = "Cài đặt > Ứng dụng > CWS Payment Listener > Pin > chọn \"Không hạn chế\" " +
                    "hoặc \"Không tối ưu hoá pin\".",
                settingsIntent = intentAppBatterySettings(pkg),
            )
        }
    }

    private fun intentAppBatterySettings(pkg: String): Intent =
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg"))

    /** Mở Intent OEM, nếu KHÔNG tồn tại (ActivityNotFoundException) thì rơi
     * về màn hình chi tiết app chuẩn Android — KHÔNG báo "đã bật thành công"
     * trong mọi trường hợp, chỉ mở đúng màn hình cài đặt gần nhất. */
    fun openSettingsWithFallback(context: Context, guide: OemGuide) {
        val primary = guide.settingsIntent
        if (primary != null) {
            try {
                context.startActivity(primary.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                return
            } catch (_: ActivityNotFoundException) {
                // Rơi xuống fallback bên dưới — KHÔNG throw, KHÔNG giả vờ thành công.
            }
        }
        context.startActivity(
            intentAppBatterySettings(context.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }
}

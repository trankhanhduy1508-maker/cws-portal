package com.cws.paymentlistener.device

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

/**
 * device_id NGẪU NHIÊN do CHÍNH app tự sinh lúc chạy lần đầu (PHẦN 2.3:
 * "Không được hardcode điện thoại của người dùng") — Admin đăng ký thủ
 * công device_id này + secret (BuildConfig.DEVICE_SECRET) vào bảng
 * payment_devices (backend/migrations/015). KHÔNG dùng IMEI/serial số
 * (PHẦN 2.5: "Không gửi IMEI, số serial thiết bị").
 */
object DeviceIdentity {
    private const val PREFS_NAME = "cws_device_identity"
    private const val KEY_DEVICE_ID = "device_id"

    private fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getOrCreateDeviceId(context: Context): String {
        val p = prefs(context)
        val existing = p.getString(KEY_DEVICE_ID, null)
        if (existing != null) return existing

        val generated = UUID.randomUUID().toString()
        p.edit().putString(KEY_DEVICE_ID, generated).apply()
        return generated
    }
}

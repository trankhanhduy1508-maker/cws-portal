package com.cws.paymentlistener.notification

import android.os.Bundle
import org.json.JSONObject

/**
 * Chuyển Notification.extras (Bundle) sang JSON AN TOÀN — PHẦN 2.1 yêu
 * cầu "toàn bộ extras có thể chuyển thành dữ liệu an toàn". Bundle có
 * thể chứa Bitmap/Parcelable/Array phức tạp (icon, action...) — CHỈ giữ
 * lại kiểu dữ liệu text/số/bool đơn giản, bỏ qua phần còn lại (KHÔNG
 * throw, KHÔNG crash service vì 1 field lạ).
 */
object NotificationExtrasReader {
    fun toSafeJson(extras: Bundle?): JSONObject {
        val json = JSONObject()
        if (extras == null) return json

        for (key in extras.keySet()) {
            try {
                val value = extras.get(key) ?: continue
                when (value) {
                    is String, is Boolean, is Int, is Long, is Double, is Float -> json.put(key, value)
                    is CharSequence -> json.put(key, value.toString())
                    else -> {
                        // Bitmap/Parcelable/Array phức tạp (vd android.icon,
                        // android.people) — bỏ qua, chỉ ghi lại TÊN kiểu để
                        // biết field đó có tồn tại lúc điều tra sau (PHẦN 3),
                        // không cố serialize nội dung nhị phân.
                        json.put(key, "<${value.javaClass.simpleName}>")
                    }
                }
            } catch (_: Exception) {
                // 1 field lỗi không được làm mất toàn bộ dump — bỏ qua field đó.
            }
        }
        return json
    }
}

package com.cws.paymentlistener.device

import android.os.Build

/** PHẦN 2.3 — đọc thông tin máy THẬT lúc chạy, KHÔNG hardcode. */
object DeviceInfoProvider {
    val manufacturer: String get() = Build.MANUFACTURER ?: "unknown"
    val brand: String get() = Build.BRAND ?: "unknown"
    val model: String get() = Build.MODEL ?: "unknown"
    val androidVersion: String get() = Build.VERSION.RELEASE ?: "unknown"
    val sdkInt: Int get() = Build.VERSION.SDK_INT
}

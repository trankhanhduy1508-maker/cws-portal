package com.cws.paymentlistener.data.remote

import com.cws.paymentlistener.data.local.EventEntity
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** Kết quả 1 lần gọi HTTP — `networkError` khác null nghĩa là KHÔNG kết
 * nối được (đáng thử lại), `code` >=0 nghĩa là Backend đã trả lời (có
 * thể 200 hợp lệ hoặc 4xx/5xx — Backend đã "quyết định", không phải lỗi
 * mạng, xử lý khác nhau ở SyncWorker). */
data class HttpResult(val code: Int, val body: String?, val networkError: String?) {
    val isNetworkError: Boolean get() = networkError != null
    val isSuccess: Boolean get() = code in 200..299
}

/**
 * KHÔNG dùng Retrofit/OkHttp — HttpURLConnection + org.json (built-in
 * Android SDK) để tối thiểu hoá dependency, đúng tinh thần "cấu trúc
 * nhỏ, dễ build" (PHẦN 2). Toàn bộ request qua HTTPS (baseUrl phải là
 * https://..., app KHÔNG cho phép cleartext — xem AndroidManifest.xml
 * usesCleartextTraffic="false").
 */
object BackendApi {
    private const val CONNECT_TIMEOUT_MS = 15_000
    private const val READ_TIMEOUT_MS = 15_000

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private fun post(baseUrl: String, path: String, headers: Map<String, String>, jsonBody: String): HttpResult {
        var connection: HttpURLConnection? = null
        return try {
            val url = URL("$baseUrl$path")
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                headers.forEach { (k, v) -> setRequestProperty(k, v) }
            }
            connection.outputStream.use { it.write(jsonBody.toByteArray(Charsets.UTF_8)) }

            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }
            HttpResult(code, body, null)
        } catch (e: Exception) {
            HttpResult(-1, null, e.message ?: e.javaClass.simpleName)
        } finally {
            connection?.disconnect()
        }
    }

    /** Gửi 1 event lên POST /payment/notification — transaction_id dùng
     * parsedTransactionId NẾU có, KHÔNG thì dùng localEventId thay thế
     * (vẫn có 1 khoá chống trùng ở Backend, dù không phải mã ngân hàng
     * thật — xem EventEntity.parsedTransactionId doc). */
    fun sendNotification(
        baseUrl: String,
        deviceId: String,
        secret: String,
        event: EventEntity,
    ): HttpResult {
        val timestamp = System.currentTimeMillis()
        val transactionId = event.parsedTransactionId ?: event.localEventId
        val amount = event.parsedAmount ?: 0L
        val transferContent = event.parsedTransferContent
            ?: listOfNotNull(event.title, event.text, event.bigText).joinToString(" ")

        val signature = RequestSigner.hmacHex(
            secret,
            RequestSigner.notificationCanonical(deviceId, timestamp, transactionId, amount, transferContent),
        )

        val rawNotification = try {
            JSONObject(event.extrasJson)
        } catch (_: Exception) {
            JSONObject()
        }

        val json = JSONObject().apply {
            put("transaction_id", transactionId)
            put("amount", amount)
            put("transfer_content", transferContent)
            put("transaction_time", isoFormat.format(Date(event.postTime)))
            put("raw_notification", rawNotification)
        }

        return post(
            baseUrl,
            "/payment/notification",
            mapOf(
                "x-device-id" to deviceId,
                "x-timestamp" to timestamp.toString(),
                "x-signature" to signature,
            ),
            json.toString(),
        )
    }

    fun sendHeartbeat(baseUrl: String, deviceId: String, secret: String, payload: JSONObject): HttpResult {
        val timestamp = System.currentTimeMillis()
        val signature = RequestSigner.hmacHex(secret, RequestSigner.heartbeatCanonical(deviceId, timestamp))

        return post(
            baseUrl,
            "/payment/device/heartbeat",
            mapOf(
                "x-device-id" to deviceId,
                "x-timestamp" to timestamp.toString(),
                "x-signature" to signature,
            ),
            payload.toString(),
        )
    }
}

package com.cws.paymentlistener.data.remote

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * RequestSigner PHẢI tạo chữ ký GIỐNG HỆT cách Backend tính lại
 * (backend/src/common/guards/device-signature.guard.ts +
 * device-heartbeat.guard.ts) — test này chỉ kiểm tra tính CHẤT của hàm
 * (xác định/ổn định, đủ nhạy để phát hiện dữ liệu bị sửa), KHÔNG thay
 * thế việc test tích hợp thật với Backend.
 */
class RequestSignerTest {

    @Test
    fun `hmacHex tra ve chuoi hex 64 ky tu (SHA-256)`() {
        val signature = RequestSigner.hmacHex("secret", "canonical-string")
        assertEquals(64, signature.length)
        assertTrue(signature.matches(Regex("[0-9a-f]{64}")))
    }

    @Test
    fun `hmacHex xac dinh - cung input tra ve cung chu ky`() {
        val a = RequestSigner.hmacHex("secret", "abc")
        val b = RequestSigner.hmacHex("secret", "abc")
        assertEquals(a, b)
    }

    @Test
    fun `hmacHex nhay voi thay doi du lieu - sua transfer_content lam sai chu ky`() {
        val canonical1 = RequestSigner.notificationCanonical("device-1", 1000L, "FT001", 45000L, "CWS CWS-AAAAAAAA AB12CD34")
        val canonical2 = RequestSigner.notificationCanonical("device-1", 1000L, "FT001", 45000L, "CWS CWS-AAAAAAAA XX99YY88")

        val sig1 = RequestSigner.hmacHex("secret", canonical1)
        val sig2 = RequestSigner.hmacHex("secret", canonical2)

        assertNotEquals(sig1, sig2)
    }

    @Test
    fun `notificationCanonical dung dinh dang khop DeviceSignatureGuard phia Backend`() {
        val canonical = RequestSigner.notificationCanonical("device-1", 1000L, "FT001", 45000L, "CWS CWS-AAAAAAAA AB12CD34")
        assertEquals("device-1.1000.FT001.45000.CWS CWS-AAAAAAAA AB12CD34", canonical)
    }

    @Test
    fun `heartbeatCanonical dung dinh dang khop DeviceHeartbeatGuard phia Backend`() {
        val canonical = RequestSigner.heartbeatCanonical("device-1", 1000L)
        assertEquals("device-1.1000", canonical)
    }
}

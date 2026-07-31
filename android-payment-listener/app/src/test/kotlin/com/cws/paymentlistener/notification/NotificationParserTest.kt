package com.cws.paymentlistener.notification

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Test cho NotificationParser (PHẦN 3/4) — regex hiện tại là ƯỚC LƯỢNG,
 * chưa xác nhận bằng mẫu MBBank thật. Test này KHÔNG chứng minh parser
 * đúng với MBBank thật, chỉ đảm bảo logic regex/parse tự nó hoạt động
 * đúng như thiết kế (không lỗi cú pháp, không crash) trên input mẫu tự
 * dựng — PHẢI viết lại/mở rộng test này sau khi có mẫu thật (PHẦN 3).
 */
class NotificationParserTest {

    @Test
    fun `parse tach duoc so tien va noi dung CWS khi day du dinh dang`() {
        val result = NotificationParser.parse(
            title = "Biến động số dư",
            text = "TK của bạn +1,234,567 VND. ND: CWS CWS-AAAAAAAA AB12CD34",
            subText = null,
            bigText = "TK của bạn +1,234,567 VND luc 10:00. So du: 5,000,000 VND. ND: CWS CWS-AAAAAAAA AB12CD34",
        )

        assertEquals(1234567L, result.amountVnd)
        assertEquals("CWS CWS-AAAAAAAA AB12CD34", result.transferContent)
        assertTrue(result.confident)
    }

    @Test
    fun `parse tra ve khong chac chan khi thieu noi dung CWS`() {
        val result = NotificationParser.parse(
            title = "Biến động số dư",
            text = "TK của bạn +500,000 VND",
            subText = null,
            bigText = null,
        )

        assertEquals(500000L, result.amountVnd)
        assertNull(result.transferContent)
        assertFalse(result.confident)
    }

    @Test
    fun `parse tra ve null het khi khong co gi tach duoc`() {
        val result = NotificationParser.parse(null, null, null, null)

        assertNull(result.amountVnd)
        assertNull(result.transferContent)
        assertNull(result.bankTransactionId)
        assertFalse(result.confident)
    }

    @Test
    fun `parse tach duoc ma giao dich dang FT khi co trong noi dung`() {
        val result = NotificationParser.parse(
            title = null,
            text = "GD: FT26073112345 +45,000 VND. ND: CWS CWS-BBBBBBBB CD34EF56",
            subText = null,
            bigText = null,
        )

        assertEquals("FT26073112345", result.bankTransactionId)
    }
}

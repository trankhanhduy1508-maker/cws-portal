package com.cws.paymentlistener.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update

@Dao
interface EventDao {
    @Insert
    suspend fun insert(event: EventEntity): Long

    @Update
    suspend fun update(event: EventEntity)

    /** PENDING (chưa từng gửi) + FAILED (gửi lỗi mạng, đáng thử lại) —
     * KHÔNG lấy REJECTED (Backend đã từ chối rõ ràng, gửi lại y hệt data
     * đó chỉ tốn request, xem PaymentsService.confirmViaMbbankNotification
     * phía Backend — rejected ghi audit rồi, không đổi ý nếu data không đổi). */
    @Query("SELECT * FROM events WHERE status IN ('pending', 'failed') ORDER BY capturedAt ASC")
    suspend fun getSendable(): List<EventEntity>

    @Query("SELECT * FROM events ORDER BY capturedAt DESC LIMIT :limit")
    suspend fun getRecent(limit: Int = 20): List<EventEntity>

    @Query("SELECT * FROM events ORDER BY capturedAt DESC LIMIT 1")
    suspend fun getLatest(): EventEntity?

    @Query("SELECT COUNT(*) FROM events WHERE status IN ('pending', 'failed')")
    suspend fun countPending(): Int

    @Query("DELETE FROM events")
    suspend fun clearAll()
}

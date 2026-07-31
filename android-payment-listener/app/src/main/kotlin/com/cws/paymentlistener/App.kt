package com.cws.paymentlistener

import android.app.Application
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.cws.paymentlistener.work.HeartbeatWorker
import com.cws.paymentlistener.work.SyncWorker
import java.util.concurrent.TimeUnit

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        schedulePeriodicWork()
    }

    /** Lịch nền — PHẦN 2.4 (retry hàng đợi định kỳ, phòng khi
     * onNotificationPosted() bị hệ thống kill giữa chừng trước khi kịp
     * enqueue immediate work) + PHẦN 2.5 (heartbeat). Cả 2 đều
     * KEEP existing để tránh nhân đôi lịch mỗi lần Application khởi động
     * lại (app bị kill/restart nhiều lần trong ngày là bình thường). */
    private fun schedulePeriodicWork() {
        val networkConstraint = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(networkConstraint)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()

        val heartbeatRequest = PeriodicWorkRequestBuilder<HeartbeatWorker>(15, TimeUnit.MINUTES)
            .setConstraints(networkConstraint)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()

        val workManager = WorkManager.getInstance(this)
        workManager.enqueueUniquePeriodicWork(
            SyncWorker.PERIODIC_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest,
        )
        workManager.enqueueUniquePeriodicWork(
            HeartbeatWorker.PERIODIC_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            heartbeatRequest,
        )
    }
}

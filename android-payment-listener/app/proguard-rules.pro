# MVP — release build hiện KHÔNG minify (xem app/build.gradle.kts,
# isMinifyEnabled = false) nên file này hiện chưa có tác dụng, giữ lại
# làm chỗ trống sẵn cho lúc bật minify (Room/WorkManager cần vài rule
# giữ lại entity/DAO annotation, sẽ bổ sung khi thật sự bật minify).

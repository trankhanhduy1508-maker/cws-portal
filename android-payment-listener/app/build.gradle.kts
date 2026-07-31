import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
}

// Đọc local.properties (KHÔNG commit — xem local.properties.example) để
// nạp URL Backend + secret ký request vào BuildConfig lúc build. Đây là
// lựa chọn "quy trình nhập secret khi build" (PHẦN 5), tránh hardcode
// secret thẳng trong file .kt commit vào git.
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) load(FileInputStream(f))
}

android {
    namespace = "com.cws.paymentlistener"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.cws.paymentlistener"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0-mvp"

        buildConfigField(
            "String",
            "BACKEND_BASE_URL",
            "\"${localProps.getProperty("cws.backend.base.url", "")}\"",
        )
        buildConfigField(
            "String",
            "DEVICE_SECRET",
            "\"${localProps.getProperty("cws.device.secret", "")}\"",
        )
        // PHẦN 6 — an toàn mặc định: build debug LUÔN capture-only (vẫn đọc/
        // parse/lưu notification cục bộ để hiệu chỉnh parser, nhưng KHÔNG
        // BAO GIỜ gọi POST /payment/notification) trừ khi CHỦ ĐỘNG bật
        // cws.payment.enabled=true trong local.properties. Heartbeat KHÔNG
        // bị chặn (không ảnh hưởng tài chính).
        buildConfigField(
            "boolean",
            "PAYMENT_ENABLED",
            localProps.getProperty("cws.payment.enabled", "false"),
        )

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    sourceSets["main"].kotlin.srcDirs("src/main/kotlin")
    sourceSets["test"].kotlin.srcDirs("src/test/kotlin")
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Room — hàng đợi cục bộ (PHẦN 2.4), KSP thay vì kapt (nhanh hơn, ít
    // vấn đề tương thích Kotlin version hơn).
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // WorkManager — retry exponential backoff + heartbeat định kỳ.
    implementation("androidx.work:work-runtime-ktx:2.9.1")

    // KHÔNG dùng Retrofit/OkHttp/Gson — HttpURLConnection + org.json (có
    // sẵn trong Android SDK) đủ cho MVP, giảm rủi ro version conflict khi
    // build lần đầu trên máy không có sẵn cache Gradle.

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}

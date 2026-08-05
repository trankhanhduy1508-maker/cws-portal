export interface AppConfig {
  port: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  b2: {
    endpoint: string;
    keyId: string;
    applicationKey: string;
    bucketName: string;
  };
  googleDriveApiKey: string | null;
  corsOrigin: string[];
  mbBank: {
    accountNumber: string | null;
    accountName: string | null;
  };
  adminApiKey: string | null;
  paymentWebhookSecret: string | null;
  sepayWebhookApiKey: string | null;
  sepayWebhookHmacSecret: string | null;
  sepayWebhookApiKeyTest: string | null;
  sepayWebhookHmacSecretTest: string | null;
}

/**
 * Đọc cấu hình từ biến môi trường — KHÔNG hardcode secret vào code
 * (đây là chính lỗ hổng đã ghi nhận ở cws_worker_full.py trong nghiên
 * cứu Round 2 trước đây: secret hardcode trong file phân phối). Backend
 * này đọc 100% qua process.env, secret thật nằm ở .env (không commit)
 * hoặc biến môi trường của nền tảng hosting (Render/Railway/Fly.io).
 *
 * Google Login KHÔNG cấu hình ở đây nữa — dùng Supabase Auth
 * (Dashboard > Authentication > Providers > Google), Backend chỉ cần
 * xác thực Bearer token qua SupabaseService.getClient().auth.getUser()
 * (xem common/optional-auth.util.ts), không tự ký/verify JWT riêng nữa.
 */
export function loadConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    supabaseUrl: required('SUPABASE_URL'),
    supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    b2: {
      endpoint: required('B2_ENDPOINT'),
      keyId: required('B2_KEY_ID'),
      applicationKey: required('B2_APPLICATION_KEY'),
      bucketName: required('B2_BUCKET_NAME'),
    },
    googleDriveApiKey: process.env.GOOGLE_DRIVE_API_KEY ?? null,
    corsOrigin: (process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    mbBank: {
      // Optional: chưa có số tài khoản MB Bank thật trong môi trường
      // này — nếu để trống, QrBankProvider chỉ trả nội dung chuyển
      // khoản dạng text (không bịa ảnh QR trỏ tới tài khoản không có
      // thật). Điền vào đây khi có tài khoản MB Bank thật để nhận tiền.
      accountNumber: process.env.MB_BANK_ACCOUNT_NUMBER ?? null,
      accountName: process.env.MB_BANK_ACCOUNT_NAME ?? null,
    },
    // Shared secret đơn giản cho route Admin (Giai đoạn 7) — KHÔNG phải
    // hệ thống phân quyền enterprise, xem common/guards/admin-key.guard.ts.
    adminApiKey: process.env.ADMIN_API_KEY ?? null,
    // Shared secret xác thực webhook ngân hàng/cổng trung gian (Casso,
    // SePay...) gọi vào POST /payments/webhook — bắt buộc vì payment_code/
    // storage_code/amount trong nội dung webhook KHÔNG phải bí mật (chính
    // khách hàng nhìn thấy các giá trị này trên QR để chuyển khoản), nên
    // chỉ validate 3 trường đó là chưa đủ để xác nhận request đến từ ngân
    // hàng thật — xem common/guards/webhook-secret.guard.ts.
    paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? null,
    // POST /payment/notification (app Android MBBank Notification Listener)
    // KHÔNG dùng 1 secret tĩnh chung nữa — mỗi thiết bị có secret RIÊNG lưu
    // trong bảng payment_devices (migration 015), xác thực qua chữ ký HMAC
    // (xem common/guards/device-signature.guard.ts), không đọc từ env.
    //
    // SePay (POST /payments/webhook/sepay) — gateway trung gian THẬT tự
    // động phát hiện tiền vào MB Bank (Webhook-only cho MVP, quyết định
    // chính thức 2026-08-01 sau khi research Webhook vs IPN — xem
    // DECISIONS.md + reports/SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md,
    // KHÔNG triển khai IPN). SepayWebhookGuard ưu tiên HMAC-SHA256
    // (SEPAY_WEBHOOK_HMAC_SECRET) nếu có cấu hình — mạnh hơn vì ký cả
    // nội dung request + chống replay bằng timestamp, đúng khuyến nghị
    // chính thức của SePay. Nếu dashboard SePay của Owner không hỗ trợ/
    // không chọn HMAC được, fallback về API Key tĩnh (SEPAY_WEBHOOK_API_KEY,
    // header cố định "Authorization: Apikey <key>"). Chỉ cần cấu hình 1
    // trong 2 biến bên dưới, không cần cả hai.
    sepayWebhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY ?? null,
    sepayWebhookHmacSecret: process.env.SEPAY_WEBHOOK_HMAC_SECRET ?? null,
    // POST /payments/webhook/sepay/test — SePay Test Mode/Sandbox
    // (my.dev.sepay.vn, tài khoản TÁCH BIỆT hoàn toàn khỏi Live, nghiên
    // cứu 2026-08-02, CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md).
    // BẮT BUỘC dùng secret KHÁC với SEPAY_WEBHOOK_HMAC_SECRET/
    // SEPAY_WEBHOOK_API_KEY của Live — đây là cơ chế tách Sandbox/Live,
    // xem SepayWebhookTestGuard.
    sepayWebhookApiKeyTest: process.env.SEPAY_WEBHOOK_API_KEY_TEST ?? null,
    sepayWebhookHmacSecretTest: process.env.SEPAY_WEBHOOK_HMAC_SECRET_TEST ?? null,
  };
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Thiếu biến môi trường bắt buộc: ${key}. Xem file .env.example để biết đầy đủ danh sách cần điền.`,
    );
  }
  return value;
}

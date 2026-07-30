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
  corsOrigin: string;
  mbBank: {
    accountNumber: string | null;
    accountName: string | null;
  };
}

/**
 * Đọc cấu hình từ biến môi trường — KHÔNG hardcode secret vào code
 * (đây là chính lỗ hổng đã ghi nhận ở cws_worker_full.py trong nghiên
 * cứu Round 2 trước đây: secret hardcode trong file phân phối). Backend
 * này đọc 100% qua process.env, secret thật nằm ở .env (không commit)
 * hoặc biến môi trường của nền tảng hosting (Render/Railway/Fly.io).
 *
 * Facebook Login KHÔNG cấu hình ở đây nữa — dùng Supabase Auth
 * (Dashboard > Authentication > Providers > Facebook), Backend chỉ cần
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
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    mbBank: {
      // Optional: chưa có số tài khoản MB Bank thật trong môi trường
      // này — nếu để trống, QrBankProvider chỉ trả nội dung chuyển
      // khoản dạng text (không bịa ảnh QR trỏ tới tài khoản không có
      // thật). Điền vào đây khi có tài khoản MB Bank thật để nhận tiền.
      accountNumber: process.env.MB_BANK_ACCOUNT_NUMBER ?? null,
      accountName: process.env.MB_BANK_ACCOUNT_NAME ?? null,
    },
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

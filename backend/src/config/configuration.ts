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
  jwtSecret: string;
  corsOrigin: string;
}

/**
 * Đọc cấu hình từ biến môi trường — KHÔNG hardcode secret vào code
 * (đây là chính lỗ hổng đã ghi nhận ở cws_worker_full.py trong nghiên
 * cứu Round 2 trước đây: secret hardcode trong file phân phối). Backend
 * này đọc 100% qua process.env, secret thật nằm ở .env (không commit)
 * hoặc biến môi trường của nền tảng hosting (Render/Railway/Fly.io).
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
    jwtSecret: required('JWT_SECRET'),
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
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

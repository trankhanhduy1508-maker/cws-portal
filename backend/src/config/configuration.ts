export interface AppConfig {
  port: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  b2: { endpoint: string; keyId: string; applicationKey: string; bucketName: string };
  googleDriveApiKey: string | null;
  jwtSecret: string;
  corsOrigin: string;
  paymentBankCode: string;
  paymentBankAccountNumber: string;
  paymentBankAccountName: string;
  paymentMomoReceiver: string;
  paymentExpiryMinutes: number;
}

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
    paymentBankCode: process.env.PAYMENT_BANK_CODE ?? 'MB',
    paymentBankAccountNumber: required('PAYMENT_BANK_ACCOUNT_NUMBER'),
    paymentBankAccountName: required('PAYMENT_BANK_ACCOUNT_NAME'),
    paymentMomoReceiver: required('PAYMENT_MOMO_RECEIVER'),
    paymentExpiryMinutes: parseInt(process.env.PAYMENT_EXPIRY_MINUTES ?? '1440', 10),
  };
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Thiếu biến môi trường bắt buộc: ${key}`);
  return value;
}

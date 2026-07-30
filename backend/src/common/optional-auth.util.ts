import * as jwt from 'jsonwebtoken';
import { Request } from 'express';

/**
 * Đọc customerId từ Bearer token NẾU có, KHÔNG bắt buộc phải đăng nhập
 * (khác jwt-auth.guard.ts — guard đó throw 401 nếu thiếu/sai token,
 * hàm này chỉ trả null). Dùng cho các route công khai muốn "biết thêm"
 * khách là ai nếu đã đăng nhập, mà không chặn khách chưa đăng nhập.
 */
export function getOptionalCustomerId(req: Request, jwtSecret: string): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, jwtSecret) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

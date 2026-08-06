import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface Bucket {
  startedAt: number;
  count: number;
}

/**
 * Bounded per-instance abuse protection for the MVP's expensive public routes.
 * This is deliberately small and fail-open only when the guard itself cannot
 * identify a request; it is not a replacement for an edge/WAF limit.
 */
@Injectable()
export class MvpRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs = 60_000;
  private readonly limits: Array<{ pattern: RegExp; max: number }> = [
    { pattern: /^\/files\/upload$/, max: 5 },
    { pattern: /^\/drive\/resolve$/, max: 20 },
    { pattern: /^\/jobs(?:\/estimate)?$/, max: 30 },
    { pattern: /^\/payments(?:\/[^/]+)?$/, max: 60 },
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const rule = this.limits.find(({ pattern }) => pattern.test(request.path));
    if (!rule) return true;

    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const key = `${request.method}:${request.path}:${ip}`;
    const now = Date.now();
    const current = this.buckets.get(key);
    const bucket =
      !current || now - current.startedAt >= this.windowMs
        ? { startedAt: now, count: 0 }
        : current;

    bucket.count += 1;
    this.buckets.set(key, bucket);

    // Keep the in-process map bounded when traffic contains many source IPs.
    if (this.buckets.size > 10_000) {
      for (const [entryKey, entry] of this.buckets) {
        if (now - entry.startedAt >= this.windowMs) this.buckets.delete(entryKey);
      }
    }

    if (bucket.count > rule.max) {
      const retryAfter = Math.max(
        1,
        Math.ceil((bucket.startedAt + this.windowMs - now) / 1000),
      );
      response.setHeader('Retry-After', String(retryAfter));
      throw new HttpException(
        'Quá nhiều yêu cầu, vui lòng thử lại sau',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}

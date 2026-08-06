import { NextFunction, Request, Response } from 'express';

/** Headers for JSON/API responses; the frontend owns its browser CSP. */
export function securityHeadersMiddleware(
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  response.setHeader('Strict-Transport-Security', 'max-age=31536000');
  response.setHeader('Cache-Control', 'no-store');
  next();
}

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';

export const UPLOAD_TIMEOUT_MS = 30 * 60 * 1000;

@Injectable()
export class UploadTimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    request.setTimeout(UPLOAD_TIMEOUT_MS);
    return next.handle();
  }
}

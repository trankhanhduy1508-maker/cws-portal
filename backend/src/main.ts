import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import {
  isAllowedCorsOrigin,
  parseCorsOrigins,
} from './common/cors-origin.util';
import { JobsRealtimeServer } from './realtime/jobs-realtime.server';
import type { Server as HttpServer } from 'http';
import { securityHeadersMiddleware } from './common/security-headers.middleware';

async function bootstrap() {
  // rawBody: true — cần cho SepayWebhookGuard xác thực chữ ký HMAC-SHA256
  // (SePay ký trên "{timestamp}.{raw_body}" — phải dùng ĐÚNG byte gốc,
  // không phải JSON.stringify(req.body) sau khi Nest đã parse lại, vì
  // thứ tự field/khoảng trắng có thể khác byte gốc, làm sai lệch chữ ký).
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(securityHeadersMiddleware);

  const allowedCorsOrigins = parseCorsOrigins(
    process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN,
  );
  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) =>
      callback(null, isAllowedCorsOrigin(requestOrigin, allowedCorsOrigins)),
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  // Gắn Realtime WebSocket bridge vào ĐÚNG HTTP server mà Nest vừa mở
  // (không mở port riêng — Portal gọi cùng BASE_URL/WS_BASE_URL).
  const realtimeServer = app.get(JobsRealtimeServer);
  const httpServer = app.getHttpServer() as HttpServer;
  realtimeServer.attach(httpServer);

  // eslint-disable-next-line no-console
  console.log(`CWS Backend đang chạy tại port ${port}`);
}
bootstrap();

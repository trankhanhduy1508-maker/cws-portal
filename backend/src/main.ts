import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JobsRealtimeServer } from './realtime/jobs-realtime.server';
import type { Server as HttpServer } from 'http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
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

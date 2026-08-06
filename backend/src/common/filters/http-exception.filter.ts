import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // MulterError (vd file upload vượt quá `limits.fileSize`, xem
    // files.controller.ts) là lỗi CLIENT (413), không phải lỗi Backend
    // — nếu không bắt riêng sẽ rơi vào nhánh 500 phía dưới, vừa sai mã
    // lỗi vừa làm ồn log (logger.error chỉ nên ghi lỗi Backend thật).
    if (exception instanceof MulterError) {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message:
          exception.code === 'LIMIT_FILE_SIZE'
            ? 'File quá lớn (vượt quá giới hạn cho phép)'
            : exception.message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Lỗi máy chủ nội bộ';

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

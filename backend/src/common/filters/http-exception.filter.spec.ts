import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { MulterError } from 'multer';
import { HttpExceptionFilter } from './http-exception.filter';

function makeHost(): {
  host: ArgumentsHost;
  response: { status: jest.Mock; json: jest.Mock };
} {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('HttpExceptionFilter', () => {
  it('trả 413 (không phải 500) khi MulterError LIMIT_FILE_SIZE — lỗi do khách upload file quá lớn, không phải lỗi Backend', () => {
    const filter = new HttpExceptionFilter();
    const { host, response } = makeHost();
    const error = new MulterError('LIMIT_FILE_SIZE');

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: HttpStatus.PAYLOAD_TOO_LARGE }),
    );
  });

  it('vẫn xử lý đúng HttpException thường (vd BadRequestException) như trước', () => {
    const filter = new HttpExceptionFilter();
    const { host, response } = makeHost();

    filter.catch(new BadRequestException('lỗi test'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });
});

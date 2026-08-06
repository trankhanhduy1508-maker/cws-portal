import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { B2StorageService } from './b2-storage.service';
import { GoogleDriveService } from './google-drive.service';
import { ResolveDriveDto } from './dto/resolve-drive.dto';
import { CwsTempUploadStorage } from './temp-upload.storage';
import { UploadTimeoutInterceptor } from './upload-timeout.interceptor';

// LƯU Ý ĐỒNG BỘ: 2 hằng số này PHẢI khớp với
// cws-portal/src/constants/renderConstants.js (ACCEPTED_FILE_EXTENSIONS,
// MAX_FILE_SIZE_BYTES). Portal (Frontend) và Backend là 2 dự án
// TypeScript/JavaScript tách biệt (không dùng chung 1 package), nên
// không thể import thẳng — nếu đổi 1 bên, PHẢI đổi bên kia theo.
const ACCEPTED_EXTENSIONS = ['.blend'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

@Controller()
export class FilesController {
  constructor(
    private readonly b2StorageService: B2StorageService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  /**
   * `limits.fileSize` bắt buộc phải khai báo Ở ĐÂY (không chỉ check
   * `file.size` sau khi upload xong) — FileInterceptor mặc định dùng
   * memory storage, tức là KHÔNG có limit này thì multer sẽ đọc TOÀN
   * BỘ file vào RAM trước khi handler chạy, dù file lớn hơn 2GB bao
   * nhiêu cũng không chặn được cho tới khi đã tốn hết bộ nhớ — rủi ro
   * OOM thật (không chỉ lý thuyết) trên môi trường production nhỏ như
   * Render.com free/starter tier.
   */
  @Post('files/upload')
  @UseInterceptors(
    UploadTimeoutInterceptor,
    FileInterceptor('file', {
      storage: new CwsTempUploadStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
        files: 1,
        fields: 8,
        parts: 12,
      },
      fileFilter: (_request, file, callback) => {
        const ext = file.originalname
          .slice(file.originalname.lastIndexOf('.'))
          .toLowerCase();
        callback(null, ACCEPTED_EXTENSIONS.includes(ext));
      },
    }),
  )
  async upload(
    @Req() request: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    request.setTimeout(30 * 60 * 1000);
    if (!file)
      throw new BadRequestException('Thiếu file trong request (field "file")');

    const ext = file.originalname
      .slice(file.originalname.lastIndexOf('.'))
      .toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Định dạng không được hỗ trợ. Chỉ chấp nhận: ${ACCEPTED_EXTENSIONS.join(', ')}`,
      );
    }

    const { key } = await this.b2StorageService.uploadFile(file);
    return {
      fileRef: key,
      fileName: file.originalname,
      fileSizeBytes: file.size,
    };
  }

  @Post('drive/resolve')
  async resolveDrive(@Body() dto: ResolveDriveDto) {
    const result = await this.googleDriveService.resolve(dto.driveLink);
    return { driveLink: dto.driveLink, ...result };
  }
}

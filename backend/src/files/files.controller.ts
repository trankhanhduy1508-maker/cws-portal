import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { B2StorageService } from './b2-storage.service';
import { GoogleDriveService } from './google-drive.service';
import { ResolveDriveDto } from './dto/resolve-drive.dto';

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
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  async upload(@UploadedFile() file?: Express.Multer.File) {
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

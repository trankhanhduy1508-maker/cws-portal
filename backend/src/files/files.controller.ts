import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { B2StorageService } from './b2-storage.service';
import { GoogleDriveService } from './google-drive.service';
import { ResolveDriveDto } from './dto/resolve-drive.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { hasBlenderHeader } from './blend-validation';
import { ResumableUploadService } from './resumable-upload.service';
import { RESUMABLE_CHUNK_SIZE_BYTES } from './resumable-upload.constants';
import { SupabaseService } from '../supabase/supabase.service';
import { getOptionalCustomerId } from '../common/optional-auth.util';
import type { Request } from 'express';

// LƯU Ý ĐỒNG BỘ: 2 hằng số này PHẢI khớp với
// cws-portal/src/constants/renderConstants.js (ACCEPTED_FILE_EXTENSIONS,
// MAX_FILE_SIZE_BYTES). Portal (Frontend) và Backend là 2 dự án
// TypeScript/JavaScript tách biệt (không dùng chung 1 package), nên
// không thể import thẳng — nếu đổi 1 bên, PHẢI đổi bên kia theo.
const ACCEPTED_EXTENSIONS = ['.blend'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

@Controller()
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private readonly b2StorageService: B2StorageService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly resumableUploadService: ResumableUploadService,
    private readonly supabaseService: SupabaseService,
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

    if (!hasBlenderHeader(file.buffer)) {
      throw new BadRequestException('File .blend không có header Blender hợp lệ');
    }

    const { key } = await this.b2StorageService.uploadFile(file);
    return {
      fileRef: key,
      fileName: file.originalname,
      fileSizeBytes: file.size,
    };
  }


  private async requiredCustomerId(req: Request): Promise<string> {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    if (!customerId) throw new UnauthorizedException('Upload cần đăng nhập Google');
    return customerId;
  }

  @Post('files/upload-resumable/init')
  async initResumableUpload(@Body() body: { fileName?: string; fileSizeBytes?: number; contentType?: string | null; resumeSessionId?: string | null }, @Req() req: Request) {
    const customerId = await this.requiredCustomerId(req);
    return this.resumableUploadService.init({
      customerId,
      fileName: body?.fileName || '',
      fileSizeBytes: Number(body?.fileSizeBytes),
      contentType: body?.contentType,
      resumeSessionId: body?.resumeSessionId,
    });
  }

  @Get('files/upload-resumable/:sessionId')
  async resumableUploadStatus(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.resumableUploadService.status(sessionId, await this.requiredCustomerId(req));
  }

  @Put('files/upload-resumable/:sessionId/parts/:partNumber')
  @UseInterceptors(FileInterceptor('chunk', { limits: { fileSize: RESUMABLE_CHUNK_SIZE_BYTES } }))
  async uploadResumablePart(@Param('sessionId') sessionId: string, @Param('partNumber', ParseIntPipe) partNumber: number, @UploadedFile() chunk: Express.Multer.File | undefined, @Req() req: Request) {
    if (!chunk) throw new BadRequestException('Thiếu chunk trong request (field "chunk")');
    return this.resumableUploadService.uploadPart(sessionId, await this.requiredCustomerId(req), partNumber, chunk.buffer);
  }

  @Post('files/upload-resumable/:sessionId/complete')
  async completeResumableUpload(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.resumableUploadService.complete(sessionId, await this.requiredCustomerId(req));
  }

  @Delete('files/upload-resumable/:sessionId')
  async abortResumableUpload(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.resumableUploadService.abort(sessionId, await this.requiredCustomerId(req));
  }
  @Post('drive/resolve')
  async resolveDrive(@Body() dto: ResolveDriveDto) {
    const result = await this.googleDriveService.resolve(dto.driveLink);
    return { driveLink: dto.driveLink, ...result };
  }
}

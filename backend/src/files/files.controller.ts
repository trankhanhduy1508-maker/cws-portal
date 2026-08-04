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

// LÆ¯U Ã Äá»’NG Bá»˜: 2 háº±ng sá»‘ nÃ y PHáº¢I khá»›p vá»›i
// cws-portal/src/constants/renderConstants.js (ACCEPTED_FILE_EXTENSIONS,
// MAX_FILE_SIZE_BYTES). Portal (Frontend) vÃ  Backend lÃ  2 dá»± Ã¡n
// TypeScript/JavaScript tÃ¡ch biá»‡t (khÃ´ng dÃ¹ng chung 1 package), nÃªn
// khÃ´ng thá»ƒ import tháº³ng â€” náº¿u Ä‘á»•i 1 bÃªn, PHáº¢I Ä‘á»•i bÃªn kia theo.
const ACCEPTED_EXTENSIONS = ['.blend'];
// The legacy endpoint uses Multer memory storage. Keep it bounded well below
// the resumable 2 GiB product limit to prevent a single request from causing
// excessive backend memory pressure. The portal uses resumable uploads.
const LEGACY_DIRECT_UPLOAD_MAX_BYTES = 64 * 1024 * 1024;

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
   * `limits.fileSize` báº¯t buá»™c pháº£i khai bÃ¡o á»ž ÄÃ‚Y (khÃ´ng chá»‰ check
   * `file.size` sau khi upload xong) â€” FileInterceptor máº·c Ä‘á»‹nh dÃ¹ng
   * memory storage, tá»©c lÃ  KHÃ”NG cÃ³ limit nÃ y thÃ¬ multer sáº½ Ä‘á»c TOÃ€N
   * Bá»˜ file vÃ o RAM trÆ°á»›c khi handler cháº¡y, dÃ¹ file lá»›n hÆ¡n 2GB bao
   * nhiÃªu cÅ©ng khÃ´ng cháº·n Ä‘Æ°á»£c cho tá»›i khi Ä‘Ã£ tá»‘n háº¿t bá»™ nhá»› â€” rá»§i ro
   * OOM tháº­t (khÃ´ng chá»‰ lÃ½ thuyáº¿t) trÃªn mÃ´i trÆ°á»ng production nhá» nhÆ°
   * Render.com free/starter tier.
   */
  @Post('files/upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: LEGACY_DIRECT_UPLOAD_MAX_BYTES } }),
  )
  async upload(@Req() req: Request, @UploadedFile() file?: Express.Multer.File) {
    if (!file)
      throw new BadRequestException('Thiáº¿u file trong request (field "file")');

    // Keep the legacy single-request endpoint behind the same authenticated
    // customer boundary as resumable uploads. The user id is not accepted
    // from the request body or filename.
    await this.requiredCustomerId(req);

    const ext = file.originalname
      .slice(file.originalname.lastIndexOf('.'))
      .toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Äá»‹nh dáº¡ng khÃ´ng Ä‘Æ°á»£c há»— trá»£. Chá»‰ cháº¥p nháº­n: ${ACCEPTED_EXTENSIONS.join(', ')}`,
      );
    }

    if (!hasBlenderHeader(file.buffer)) {
      throw new BadRequestException('File .blend khÃ´ng cÃ³ header Blender há»£p lá»‡');
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
    if (!customerId) throw new UnauthorizedException('Upload cáº§n Ä‘Äƒng nháº­p Google');
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
    if (!chunk) throw new BadRequestException('Thiáº¿u chunk trong request (field "chunk")');
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


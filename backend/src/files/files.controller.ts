import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UnauthorizedException,
  UseInterceptors,
  UseGuards,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { B2StorageService } from './b2-storage.service';
import { GoogleDriveService } from './google-drive.service';
import { ResolveDriveDto } from './dto/resolve-drive.dto';
import { CwsTempUploadStorage } from './temp-upload.storage';
import { UploadTimeoutInterceptor } from './upload-timeout.interceptor';
import { MvpRateLimitGuard } from '../common/guards/mvp-rate-limit.guard';
import {
  ACCEPTED_INPUT_EXTENSIONS,
  getInputFormat,
  hasValidInputSignature,
} from './input-file.util';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { getOptionalCustomerId } from '../common/optional-auth.util';
import { SupabaseService } from '../supabase/supabase.service';
import { InputUploadsService } from './input-uploads.service';
import { InputSecurityService } from './input-security.service';
import { JobsService } from '../jobs/jobs.service';
import { createHash } from 'node:crypto';

// LƯU Ý ĐỒNG BỘ: 2 hằng số này PHẢI khớp với
// cws-portal/src/constants/renderConstants.js (ACCEPTED_FILE_EXTENSIONS,
// MAX_FILE_SIZE_BYTES). Portal (Frontend) và Backend là 2 dự án
// TypeScript/JavaScript tách biệt (không dùng chung 1 package), nên
// không thể import thẳng — nếu đổi 1 bên, PHẢI đổi bên kia theo.
const ACCEPTED_EXTENSIONS = ACCEPTED_INPUT_EXTENSIONS;
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

@Controller()
export class FilesController {
  constructor(
    private readonly b2StorageService: B2StorageService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly supabaseService: SupabaseService,
    private readonly inputUploadsService: InputUploadsService,
    private readonly inputSecurityService: InputSecurityService,
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService,
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
  @UseGuards(JwtAuthGuard, MvpRateLimitGuard)
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
        callback(
          null,
          ACCEPTED_EXTENSIONS.some((accepted) => accepted === ext),
        );
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
    if (file.size <= 0 || file.originalname.length > 255) {
      throw new BadRequestException('File rỗng hoặc tên file quá dài');
    }

    const customerId = await getOptionalCustomerId(
      request,
      this.supabaseService,
    );
    if (!customerId) throw new UnauthorizedException('Cần đăng nhập để upload');

    const ext = file.originalname
      .slice(file.originalname.lastIndexOf('.'))
      .toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((accepted) => accepted === ext)) {
      throw new BadRequestException(
        `Định dạng không được hỗ trợ. Chỉ chấp nhận: ${ACCEPTED_EXTENSIONS.join(', ')}`,
      );
    }

    if (!(await hasValidInputSignature(file.path, file.originalname))) {
      throw new BadRequestException(
        'Nội dung file không khớp với phần mở rộng .blend, .zip hoặc .rar',
      );
    }

    const security = await this.inputSecurityService.inspect(file.path, file.originalname, file.size);
    const { key } = await this.b2StorageService.uploadFile(file);
    await this.inputUploadsService.record(
      key,
      customerId,
      file.originalname,
      file.size,
      security,
    );
    const job = await this.jobsService.createOrder(
      { fileRef: key, fileName: file.originalname, fileSizeBytes: file.size },
      customerId,
      this.autoJobKey(customerId, security.contentSha256),
    );
    return {
      fileRef: key,
      fileName: file.originalname,
      fileSizeBytes: file.size,
      inputFormat: getInputFormat(file.originalname),
      jobId: job.jobId,
    };
  }

  @Post('drive/resolve')
  @UseGuards(JwtAuthGuard, MvpRateLimitGuard)
  async resolveDrive(@Body() dto: ResolveDriveDto, @Req() request: Request) {
    const customerId = await getOptionalCustomerId(
      request,
      this.supabaseService,
    );
    if (!customerId) throw new UnauthorizedException('Cần đăng nhập để kiểm tra Google Drive');

    let result = await this.googleDriveService.resolve(dto.driveLink);
    const materialized = await this.googleDriveService.materializeToB2(
      dto.driveLink,
      async (path, fileName, sizeBytes) => this.inputSecurityService.inspect(path, fileName, sizeBytes),
    );
    result = { ...result, ...materialized, fileRef: materialized.key };

    const fileRef = result.fileRef;
    const fileName = result.fileName;
    const fileSizeBytes = result.fileSizeBytes;
    if (
      !fileRef ||
      !fileName ||
      typeof fileSizeBytes !== 'number' ||
      !Number.isInteger(fileSizeBytes) ||
      fileSizeBytes <= 0
    ) {
      throw new BadRequestException(
        'Google Drive chưa trả về input đã materialize hợp lệ',
      );
    }

    await this.inputUploadsService.record(
      fileRef,
      customerId,
      fileName,
      fileSizeBytes as number,
      materialized.security,
    );
    const job = await this.jobsService.createOrder(
      { fileRef, driveLink: null, fileName, fileSizeBytes: fileSizeBytes as number },
      customerId,
      this.autoJobKey(customerId, materialized.security?.contentSha256 ?? fileRef),
    );
    return { driveLink: dto.driveLink, ...result, jobId: job.jobId };
  }

  private autoJobKey(customerId: string, stableInputIdentity: string): string {
    return `auto-${createHash('sha256').update(`${customerId}:${stableInputIdentity}`).digest('hex')}`;
  }
}

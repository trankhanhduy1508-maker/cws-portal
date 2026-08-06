import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RenderProfileId } from '../domain/render-profile';

export class CreateJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  fileRef?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  driveLink?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  fileName?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2 * 1024 * 1024 * 1024)
  fileSizeBytes?: number | null;

  // "Tạo Job" (CWS_MVP_WORKFLOW_FINAL.md): Phần mềm/Phiên bản/Ghi chú —
  // không bắt buộc, chỉ là thông tin tham khảo cho admin.
  @IsOptional()
  @IsString()
  @MaxLength(128)
  software?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  softwareVersion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @IsIn(Object.values(RenderProfileId))
  profileId!: RenderProfileId;
}

export class EstimateJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  fileRef?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  driveLink?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2 * 1024 * 1024 * 1024)
  fileSizeBytes?: number | null;

  @IsIn(Object.values(RenderProfileId))
  profileId!: RenderProfileId;
}

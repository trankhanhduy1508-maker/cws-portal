import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { RenderProfileId } from '../domain/render-profile';

export class CreateJobDto {
  @IsOptional()
  @IsString()
  fileRef?: string | null;

  @IsOptional()
  @IsString()
  driveLink?: string | null;

  @IsOptional()
  @IsString()
  fileName?: string | null;

  @IsOptional()
  @IsNumber()
  fileSizeBytes?: number | null;

  // "Tạo Job" (CWS_MVP_WORKFLOW_FINAL.md): Phần mềm/Phiên bản/Ghi chú —
  // không bắt buộc, chỉ là thông tin tham khảo cho admin.
  @IsOptional()
  @IsString()
  software?: string | null;

  @IsOptional()
  @IsString()
  softwareVersion?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsIn(Object.values(RenderProfileId))
  profileId!: RenderProfileId;
}

export class EstimateJobDto {
  @IsOptional()
  @IsString()
  fileRef?: string | null;

  @IsOptional()
  @IsString()
  driveLink?: string | null;

  @IsOptional()
  @IsNumber()
  fileSizeBytes?: number | null;

  @IsIn(Object.values(RenderProfileId))
  profileId!: RenderProfileId;
}

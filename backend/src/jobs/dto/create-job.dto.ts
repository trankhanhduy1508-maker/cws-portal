import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
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

  @IsIn(Object.values(RenderProfileId))
  profileId!: RenderProfileId;

  @IsString()
  @IsNotEmpty()
  paymentId!: string;
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

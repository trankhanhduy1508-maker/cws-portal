import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestChangesDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;
}

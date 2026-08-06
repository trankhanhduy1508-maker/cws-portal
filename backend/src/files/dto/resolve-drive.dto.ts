import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResolveDriveDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  driveLink!: string;
}

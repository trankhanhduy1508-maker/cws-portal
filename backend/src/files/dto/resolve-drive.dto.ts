import { IsNotEmpty, IsString } from 'class-validator';

export class ResolveDriveDto {
  @IsString()
  @IsNotEmpty()
  driveLink!: string;
}

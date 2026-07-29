import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { RenderProfileId } from '../../jobs/domain/render-profile';
import { PaymentMethod } from '../payment.types';

export class CreatePaymentDto {
  @IsIn(Object.values(PaymentMethod))
  method!: PaymentMethod;

  @IsIn(Object.values(RenderProfileId))
  profileId!: RenderProfileId;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2 * 1024 * 1024 * 1024)
  fileSizeBytes?: number | null;
}

export class SubmitPaymentEvidenceDto {
  @IsInt()
  @Min(1)
  @Max(2000000000)
  claimedAmountVnd!: number;
}

export class AdminPaymentDecisionDto {
  @IsInt()
  @Min(0)
  @Max(2000000000)
  receivedAmountVnd!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AdminPaymentNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

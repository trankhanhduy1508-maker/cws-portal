import { IsIn, IsNumber, Min } from 'class-validator';
import { PaymentMethod } from '../payment.types';

export class CreatePaymentDto {
  @IsNumber()
  @Min(1)
  amountVnd!: number;

  @IsIn(Object.values(PaymentMethod))
  method!: PaymentMethod;
}

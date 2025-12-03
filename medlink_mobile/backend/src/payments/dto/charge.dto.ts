import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class ChargeDto {
  @IsString()
  @IsNotEmpty()
  consultationId: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  mobileMoneyNumber?: string;

  @IsNumber()
  amount: number;
}


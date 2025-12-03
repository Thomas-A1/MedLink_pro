import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PrescriptionStatus } from '../entities/prescription.entity';

export class UpdatePrescriptionStatusDto {
  @IsEnum(PrescriptionStatus)
  status: PrescriptionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}



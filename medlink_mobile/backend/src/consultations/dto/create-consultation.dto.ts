import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  ConsultationType,
  UrgencyLevel,
} from '../entities/consultation.entity';
import { Transform } from 'class-transformer';

export class CreateConsultationDto {
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @IsEnum(ConsultationType)
  consultationType: ConsultationType;

  @IsEnum(UrgencyLevel)
  urgencyLevel: UrgencyLevel;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  audioComplaintUrl?: string;

  @IsOptional()
  complaintMetadata?: Record<string, any>;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(1000)
  paymentAmount?: number;
}


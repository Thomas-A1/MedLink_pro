import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateQueueEntryDto {
  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  patientName?: string;

  @IsOptional()
  @IsString()
  patientEmail?: string;

  @IsOptional()
  @IsString()
  patientPhone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}


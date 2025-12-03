import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SubstitutionDto {
  @IsString()
  @IsNotEmpty()
  medicationId!: string;

  @IsString()
  @IsNotEmpty()
  substituteDrugName!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class FulfilPrescriptionDto {
  @IsOptional()
  @IsArray()
  dispensedMedications?: string[]; // list of medication IDs fulfilled

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  pickupNotes?: string;

  @IsOptional()
  @IsString()
  pickupContact?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubstitutionDto)
  substitutions?: SubstitutionDto[];

  @IsString()
  @IsNotEmpty()
  pharmacistId: string;
}

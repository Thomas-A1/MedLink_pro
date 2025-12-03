import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsString()
  category: string;

  @IsString()
  form: string;

  @IsString()
  strength: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantityInStock: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderLevel: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  unitPrice: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  sellingPrice: number;

  @IsOptional()
  @IsString()
  barcode?: string;

  @Type(() => Boolean)
  @IsBoolean()
  requiresPrescription: boolean;
}

import { IsArray, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SaleItemForPaymentDto {
  @IsUUID()
  inventoryItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

export class ServiceItemForPaymentDto {
  @IsUUID()
  serviceId!: string;
  @IsInt()
  @Min(1)
  quantity!: number;
  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

export class InitiatePaymentDto {
  @IsEnum(['sale', 'prescription', 'service'])
  purpose!: 'sale' | 'prescription' | 'service';

  // For purpose === 'sale', provide items
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemForPaymentDto)
  @IsOptional()
  items?: SaleItemForPaymentDto[];
  // Optional services as part of sale
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceItemForPaymentDto)
  @IsOptional()
  serviceItems?: ServiceItemForPaymentDto[];

  // For purpose === 'prescription'
  @IsUUID()
  @IsOptional()
  prescriptionId?: string;

  // For purpose === 'service'
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  customerPhone?: string;
}



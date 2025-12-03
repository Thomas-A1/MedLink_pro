import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class StockUpdateDto {
  @IsOptional()
  @IsString()
  inventoryItemId?: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @Type(() => Number)
  @IsNumber()
  quantityChange: number;

  @IsOptional()
  @IsString()
  reference?: string;
}



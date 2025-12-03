import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { StockMovementType } from '../entities/stock-movement.entity';

export class AdjustInventoryDto {
  @Type(() => Number)
  @IsInt()
  quantityDelta: number;

  @IsEnum(StockMovementType)
  movementType: StockMovementType;

  @IsOptional()
  @IsString()
  notes?: string;
}


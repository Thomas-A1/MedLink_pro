import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateInventoryBatchDto {
  @IsString()
  @IsNotEmpty()
  lotNumber: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}



import { Type } from 'class-transformer';
import { IsArray, ValidateNested, IsString } from 'class-validator';
import { CreateInventoryItemDto } from '../../inventory/dto/create-inventory-item.dto';

export class IntegrationInventoryItemDto extends CreateInventoryItemDto {
  @IsString()
  override externalId: string;
}

export class SyncInventoryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegrationInventoryItemDto)
  items: IntegrationInventoryItemDto[];
}



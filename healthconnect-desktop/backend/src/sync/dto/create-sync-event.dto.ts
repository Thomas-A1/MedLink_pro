import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { SyncStatus } from '../entities/sync-event.entity';

export class CreateSyncEventDto {
  @IsString()
  @IsNotEmpty()
  source: string;

  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  entityId?: string;

  @IsString()
  @IsNotEmpty()
  payload: string;

  @IsString()
  @IsNotEmpty()
  payloadHash: string;

  @IsEnum(SyncStatus)
  status: SyncStatus;
}

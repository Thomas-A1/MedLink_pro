import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncEvent } from './entities/sync-event.entity';
import { SyncSession } from './entities/sync-session.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SyncEvent, SyncSession, Pharmacy])],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}

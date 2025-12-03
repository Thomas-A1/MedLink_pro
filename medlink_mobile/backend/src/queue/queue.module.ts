import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QueueEntry } from './entities/queue-entry.entity';
import { Consultation } from '../consultations/entities/consultation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QueueEntry, Consultation])],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}


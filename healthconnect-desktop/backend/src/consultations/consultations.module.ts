import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { Consultation } from './entities/consultation.entity';
import { User } from '../common/entities/user.entity';
import { QueueEntry } from '../queue/entities/queue-entry.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { AIModule } from '../ai/ai.module';
import { WebRTCGateway } from './webrtc.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Consultation, User, QueueEntry, Pharmacy]),
    AIModule,
    JwtModule,
  ],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, WebRTCGateway],
  exports: [ConsultationsService, WebRTCGateway],
})
export class ConsultationsModule {}


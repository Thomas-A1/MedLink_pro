import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { Consultation } from './entities/consultation.entity';
import { User } from '../users/entities/user.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { AIModule } from '../ai/ai.module';
import { WebRTCGateway } from './webrtc.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Consultation, User, Doctor]),
    AIModule,
    JwtModule,
    ConfigModule,
  ],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, WebRTCGateway],
  exports: [ConsultationsService, WebRTCGateway],
})
export class ConsultationsModule {}


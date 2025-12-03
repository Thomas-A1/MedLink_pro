import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { QueueEntry } from './entities/queue-entry.entity';

@Controller('queue')
@UseGuards(JwtAuthGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('consultations/:consultationId')
  async getForConsultation(
    @CurrentUser() user: User,
    @Param('consultationId') consultationId: string,
  ) {
    const entry = await this.queueService.getForConsultation(consultationId, user);
    return { data: this.mapQueueEntry(entry) };
  }

  @Get('doctor')
  async getDoctorQueue(@Query('doctorId') doctorId: string) {
    const entries = await this.queueService.getDoctorQueue(doctorId);
    return {
      data: entries.map((entry) => this.mapQueueEntry(entry)),
    };
  }

  private mapQueueEntry(entry: QueueEntry) {
    return {
      id: entry.id,
      doctorId: entry.consultation.doctor.id,
      patientId: entry.consultation.patient.id,
      consultationId: entry.consultation.id,
      position: entry.position,
      joinedAt: entry.joinedAt,
      estimatedWaitTime: entry.estimatedWaitTime,
      readyAt: entry.readyAt,
      timeoutAt: entry.timeoutAt,
      status: entry.status,
      urgencyLevel: entry.urgencyLevel,
      doctorName: entry.consultation.doctor.name,
      doctorSpecialty: entry.consultation.doctor.specialty,
      doctorFacility: entry.consultation.doctor.facility,
    };
  }
}


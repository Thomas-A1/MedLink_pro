import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Consultation } from './entities/consultation.entity';

@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateConsultationDto,
  ) {
    const consultation = await this.consultationsService.createConsultation(user.id, dto);
    return {
      data: this.mapConsultation(consultation),
    };
  }

  @Get('me')
  async listMine(@CurrentUser() user: User) {
    const consultations = await this.consultationsService.listForPatient(user.id);
    return {
      data: consultations.map((consultation) => this.mapConsultation(consultation)),
    };
  }

  @Get(':id')
  async getOne(@CurrentUser() user: User, @Param('id') id: string) {
    const consultation = await this.consultationsService.getConsultationById(id, user.id);
    return {
      data: this.mapConsultation(consultation),
    };
  }

  private mapConsultation(consultation: Consultation) {
    return {
      id: consultation.id,
      patientId: consultation.patient.id,
      doctorId: consultation.doctor.id,
      status: consultation.status,
      urgencyLevel: consultation.urgencyLevel,
      chiefComplaint: consultation.chiefComplaint,
      audioComplaintUrl: consultation.audioComplaintUrl,
      consultationType: consultation.consultationType,
      paymentStatus: consultation.paymentStatus,
      paymentAmount: consultation.paymentAmount,
      paymentTransactionId: consultation.paymentTransactionId,
      queuePosition: consultation.queuePosition,
      queueJoinedAt: consultation.queueJoinedAt,
      estimatedWaitTime: consultation.estimatedWaitTime,
      callStartedAt: consultation.callStartedAt,
      callEndedAt: consultation.callEndedAt,
      callDuration: consultation.callDuration,
      callRecordingUrl: consultation.callRecordingUrl,
      transcript: consultation.transcript,
      doctorNotes: consultation.doctorNotes,
      diagnosis: consultation.diagnosis,
      treatmentPlan: consultation.treatmentPlan,
      followUpRequired: consultation.followUpRequired,
      followUpDate: consultation.followUpDate,
      createdAt: consultation.createdAt,
      updatedAt: consultation.updatedAt,
      doctorName: consultation.doctor.name,
      doctorSpecialty: consultation.doctor.specialty,
      doctorFacility: consultation.doctor.facility,
      patientName: `${consultation.patient.firstName ?? ''} ${consultation.patient.lastName ?? ''}`.trim(),
      complaintMetadata: consultation.complaintMetadata,
    };
  }

  @Patch(':id/start-call')
  async startCall(@Param('id') id: string, @CurrentUser() user: User) {
    const consultation = await this.consultationsService.startCall(id, user.id);
    return { data: this.mapConsultation(consultation) };
  }

  @Patch(':id/end-call')
  async endCall(
    @Param('id') id: string,
    @Body() body: { duration?: number; summary?: string; transcript?: string },
    @CurrentUser() user: User,
  ) {
    const consultation = await this.consultationsService.endCall(
      id,
      user.id,
      body.duration,
      body.summary,
    );
    return { data: this.mapConsultation(consultation) };
  }

  @Get(':id/summary')
  async getCallSummary(@Param('id') id: string, @Body() body?: { transcript?: string }) {
    const summary = await this.consultationsService.generateCallSummary(id, body?.transcript);
    return { data: summary };
  }

  @Post(':id/summary/generate')
  async generateSummaryWithTranscript(
    @Param('id') id: string,
    @Body() body: { transcript: string },
  ) {
    const summary = await this.consultationsService.generateCallSummary(id, body.transcript);
    return { data: summary };
  }
}


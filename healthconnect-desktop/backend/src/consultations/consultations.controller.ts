import { Controller, Get, Param, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('consultations')
@UseGuards(JwtAccessGuard)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  async create(@Body() body: any, @CurrentUser() user: any) {
    return this.consultationsService.create({
      patientId: user?.userId,
      doctorId: body.doctorId,
      consultationType: body.consultationType,
      urgencyLevel: body.urgencyLevel,
      chiefComplaint: body.chiefComplaint,
      audioComplaintUrl: body.audioComplaintUrl,
    });
  }

  @Get('my')
  async getMyConsultations(@CurrentUser() user: any) {
    return this.consultationsService.findByUser(user?.userId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.consultationsService.findById(id);
  }

  @Get(':id/queue-status')
  async getQueueStatus(@Param('id') id: string) {
    return this.consultationsService.getQueueStatus(id);
  }

  @Get('doctors/:doctorId/queue')
  async getDoctorQueue(@Param('doctorId') doctorId: string, @CurrentUser() user: any) {
    // Only allow doctors to view their own queue, or allow patients to view any doctor's queue
    return this.consultationsService.getDoctorQueue(doctorId);
  }

  @Patch(':id/start-call')
  async startCall(@Param('id') id: string, @CurrentUser() user: any) {
    return this.consultationsService.startCall(id, user?.userId);
  }

  @Patch(':id/end-call')
  async endCall(
    @Param('id') id: string,
    @Body() body: { duration?: number; summary?: string; transcript?: string },
    @CurrentUser() user: any,
  ) {
    return this.consultationsService.endCall(id, body.duration, body.summary, user?.userId);
  }

  @Get(':id/summary')
  async getCallSummary(@Param('id') id: string, @Body() body?: { transcript?: string }) {
    return this.consultationsService.generateCallSummary(id, body?.transcript);
  }

  @Post(':id/summary/generate')
  async generateSummaryWithTranscript(
    @Param('id') id: string,
    @Body() body: { transcript: string },
  ) {
    return this.consultationsService.generateCallSummary(id, body.transcript);
  }
}


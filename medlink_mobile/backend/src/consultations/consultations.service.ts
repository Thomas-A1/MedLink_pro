import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation, ConsultationPaymentStatus, ConsultationStatus } from './entities/consultation.entity';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { User } from '../users/entities/user.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { AIService } from '../ai/ai.service';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepo: Repository<Consultation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    private readonly aiService: AIService,
  ) {}

  async createConsultation(patientId: string, dto: CreateConsultationDto) {
    const patient = await this.userRepo.findOne({ where: { id: patientId } });
    if (!patient) throw new UnauthorizedException();

    const doctor = await this.doctorRepo.findOne({ where: { id: dto.doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const consultation = this.consultationRepo.create({
      patient,
      doctor,
      status: ConsultationStatus.REQUESTED,
      urgencyLevel: dto.urgencyLevel,
      consultationType: dto.consultationType,
      paymentStatus: ConsultationPaymentStatus.PENDING,
      chiefComplaint: dto.chiefComplaint,
      audioComplaintUrl: dto.audioComplaintUrl,
      complaintMetadata: dto.complaintMetadata ?? {},
      paymentAmount: dto.paymentAmount ?? doctor.consultationFee,
    });

    return this.consultationRepo.save(consultation);
  }

  async getConsultationById(id: string, patientId: string) {
    const consultation = await this.consultationRepo.findOne({
      where: { id },
      relations: ['doctor', 'patient'],
    });
    if (!consultation || consultation.patient.id !== patientId) {
      throw new NotFoundException();
    }
    return consultation;
  }

  async listForPatient(patientId: string) {
    return this.consultationRepo.find({
      where: { patient: { id: patientId } },
      order: { createdAt: 'DESC' },
    });
  }

  async startCall(consultationId: string, userId: string): Promise<Consultation> {
    const consultation = await this.consultationRepo.findOne({
      where: { id: consultationId },
      relations: ['patient', 'doctor'],
    });
    
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (consultation.patient.id !== userId && consultation.doctor.id !== userId) {
      throw new UnauthorizedException('Not authorized to start this call');
    }

    if (consultation.status !== ConsultationStatus.QUEUED) {
      throw new BadRequestException('Consultation must be in queue to start call');
    }

    consultation.status = ConsultationStatus.IN_PROGRESS;
    consultation.callStartedAt = new Date();
    return await this.consultationRepo.save(consultation);
  }

  async endCall(
    consultationId: string,
    userId: string,
    durationSeconds?: number,
    summary?: string,
  ): Promise<Consultation> {
    const consultation = await this.consultationRepo.findOne({
      where: { id: consultationId },
      relations: ['patient', 'doctor'],
    });
    
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (consultation.patient.id !== userId && consultation.doctor.id !== userId) {
      throw new UnauthorizedException('Not authorized to end this call');
    }

    if (consultation.status !== ConsultationStatus.IN_PROGRESS) {
      throw new BadRequestException('Consultation is not in progress');
    }

    consultation.status = ConsultationStatus.COMPLETED;
    consultation.callEndedAt = new Date();
    
    if (durationSeconds) {
      consultation.callDuration = durationSeconds;
    } else if (consultation.callStartedAt) {
      consultation.callDuration = Math.floor(
        (consultation.callEndedAt.getTime() - consultation.callStartedAt.getTime()) / 1000,
      );
    }

    if (summary) {
      consultation.doctorNotes = summary;
    }

    return await this.consultationRepo.save(consultation);
  }

  async generateCallSummary(consultationId: string, transcript?: string) {
    const consultation = await this.consultationRepo.findOne({
      where: { id: consultationId },
      relations: ['patient', 'doctor'],
    });
    
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (consultation.status !== ConsultationStatus.COMPLETED) {
      throw new BadRequestException('Consultation must be completed to generate summary');
    }

    // If transcript is provided, use AI to generate enhanced summary
    let aiSummary: {
      summary: string;
      diagnosis?: string;
      treatmentPlan?: string;
      keyPoints: string[];
    } | null = null;

    if (transcript && transcript.trim().length > 0) {
      try {
        aiSummary = await this.aiService.generateCallSummary(transcript, {
          chiefComplaint: consultation.chiefComplaint,
          patientName: `${consultation.patient.firstName ?? ''} ${consultation.patient.lastName ?? ''}`.trim(),
          doctorName: consultation.doctor.name,
          duration: consultation.callDuration ?? 0,
        });

        // Update consultation with AI-generated diagnosis and treatment plan if not already set
        if (aiSummary.diagnosis && !consultation.diagnosis) {
          consultation.diagnosis = aiSummary.diagnosis;
        }
        if (aiSummary.treatmentPlan && !consultation.treatmentPlan) {
          consultation.treatmentPlan = aiSummary.treatmentPlan;
        }
        if (aiSummary.summary && !consultation.doctorNotes) {
          consultation.doctorNotes = aiSummary.summary;
        }
        consultation.transcript = transcript;
        await this.consultationRepo.save(consultation);
      } catch (error) {
        // If AI fails, continue with basic summary
        console.error('AI summary generation failed:', error);
      }
    }

    return {
      consultationId: consultation.id,
      patient: {
        id: consultation.patient.id,
        name: `${consultation.patient.firstName ?? ''} ${consultation.patient.lastName ?? ''}`.trim(),
      },
      doctor: {
        id: consultation.doctor.id,
        name: consultation.doctor.name,
        specialty: consultation.doctor.specialty,
      },
      consultationType: consultation.consultationType,
      chiefComplaint: consultation.chiefComplaint,
      diagnosis: aiSummary?.diagnosis || consultation.diagnosis,
      treatmentPlan: aiSummary?.treatmentPlan || consultation.treatmentPlan,
      doctorNotes: aiSummary?.summary || consultation.doctorNotes,
      transcript: consultation.transcript || transcript,
      keyPoints: aiSummary?.keyPoints || [],
      callDuration: consultation.callDuration,
      callStartedAt: consultation.callStartedAt,
      callEndedAt: consultation.callEndedAt,
      createdAt: consultation.createdAt,
    };
  }
}


import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation, ConsultationStatus, PaymentStatus } from './entities/consultation.entity';
import { User } from '../common/entities/user.entity';
import { QueueEntry, QueueStatus } from '../queue/entities/queue-entry.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { AIService } from '../ai/ai.service';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectRepository(Consultation) private readonly consultationRepo: Repository<Consultation>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(QueueEntry) private readonly queueRepo: Repository<QueueEntry>,
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
    private readonly aiService: AIService,
  ) {}

  async findById(id: string): Promise<Consultation> {
    const consultation = await this.consultationRepo.findOne({
      where: { id },
      relations: ['patient', 'doctor'],
    });
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }
    return consultation;
  }

  async findByUser(userId: string): Promise<Consultation[]> {
    return this.consultationRepo
      .createQueryBuilder('consultation')
      .leftJoinAndSelect('consultation.patient', 'patient')
      .leftJoinAndSelect('consultation.doctor', 'doctor')
      .where('patient.id = :userId OR doctor.id = :userId', { userId })
      .orderBy('consultation.createdAt', 'DESC')
      .getMany();
  }

  async create(data: {
    patientId: string;
    doctorId: string;
    consultationType: string;
    urgencyLevel: string;
    chiefComplaint?: string;
    audioComplaintUrl?: string;
  }): Promise<Consultation> {
    const patient = await this.userRepo.findOne({ where: { id: data.patientId } });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const doctor = await this.userRepo.findOne({ where: { id: data.doctorId } });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const consultation = this.consultationRepo.create({
      patient,
      doctor,
      consultationType: data.consultationType as any,
      urgencyLevel: data.urgencyLevel as any,
      chiefComplaint: data.chiefComplaint,
      audioComplaintUrl: data.audioComplaintUrl,
      status: ConsultationStatus.REQUESTED,
      paymentStatus: PaymentStatus.PENDING,
    });

    return await this.consultationRepo.save(consultation);
  }

  async markAsPaid(consultationId: string, transactionId: string): Promise<Consultation> {
    const consultation = await this.findById(consultationId);
    consultation.paymentStatus = PaymentStatus.PAID;
    consultation.paymentTransactionId = transactionId;
    consultation.status = ConsultationStatus.QUEUED;
    consultation.queueJoinedAt = new Date();

    // Calculate queue position based on consultations for this doctor
    const queuedConsultations = await this.consultationRepo.find({
      where: {
        doctor: { id: consultation.doctor.id },
        status: ConsultationStatus.QUEUED,
      },
      order: { queueJoinedAt: 'ASC' },
    });

    consultation.queuePosition = queuedConsultations.length + 1;

    return await this.consultationRepo.save(consultation);
  }

  async addToQueue(consultationId: string): Promise<QueueEntry> {
    const consultation = await this.findById(consultationId);
    
    if (consultation.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Consultation must be paid before joining queue');
    }

    // Find or create a virtual pharmacy for doctor consultations
    // For now, we'll use the doctor's organization's first pharmacy
    const doctor = consultation.doctor;
    let pharmacy = await this.pharmacyRepo.findOne({
      where: { organization: { id: doctor.organization?.id } },
    });

    if (!pharmacy) {
      // Create a virtual pharmacy for consultations if none exists
      pharmacy = this.pharmacyRepo.create({
        name: `${doctor.firstName} ${doctor.lastName} - Virtual Clinic`,
        organization: doctor.organization,
        address: 'Virtual',
        region: 'Virtual',
        district: 'Virtual',
        contactPhone: doctor.phoneNumber ?? '',
      });
      pharmacy = await this.pharmacyRepo.save(pharmacy);
    }

    // Check if queue entry already exists
    let queueEntry = await this.queueRepo.findOne({
      where: {
        pharmacy: { id: pharmacy.id },
        patient: { id: consultation.patient.id },
      },
    });

    if (!queueEntry) {
      const currentTop = await this.queueRepo.findOne({
        where: { pharmacy: { id: pharmacy.id } },
        order: { priority: 'DESC' },
      });

      const priority = currentTop ? currentTop.priority + 1 : 1;

      queueEntry = this.queueRepo.create({
        pharmacy,
        patient: consultation.patient,
        status: QueueStatus.PENDING,
        priority,
      });
      queueEntry = await this.queueRepo.save(queueEntry);
    }

    return queueEntry;
  }

  async getQueueStatus(consultationId: string) {
    const consultation = await this.findById(consultationId);
    
    if (consultation.status !== ConsultationStatus.QUEUED) {
      throw new BadRequestException('Consultation is not in queue');
    }

    // Get all queued consultations for this doctor, ordered by queueJoinedAt
    const queuedConsultations = await this.consultationRepo.find({
      where: {
        doctor: { id: consultation.doctor.id },
        status: ConsultationStatus.QUEUED,
      },
      relations: ['patient'],
      order: { queueJoinedAt: 'ASC' },
    });

    // Get active consultations (currently in call)
    const activeConsultations = await this.consultationRepo.find({
      where: {
        doctor: { id: consultation.doctor.id },
        status: ConsultationStatus.IN_PROGRESS,
      },
    });

    // Find current consultation position (1-based)
    const currentPosition = queuedConsultations.findIndex(c => c.id === consultationId) + 1;
    
    // Recalculate and update all queue positions to ensure accuracy
    for (let i = 0; i < queuedConsultations.length; i++) {
      queuedConsultations[i].queuePosition = i + 1;
      await this.consultationRepo.save(queuedConsultations[i]);
    }
    
    // Calculate estimated wait time
    // Average consultation duration: 15 minutes
    // Active consultations count as 1 position each
    const consultationsAhead = currentPosition - 1;
    const activeCount = activeConsultations.length;
    const estimatedWaitTime = (consultationsAhead + activeCount) * 15; // minutes

    // Update consultation with current position and wait time
    consultation.queuePosition = currentPosition;
    consultation.estimatedWaitTime = estimatedWaitTime;
    await this.consultationRepo.save(consultation);

    return {
      consultationId: consultation.id,
      position: currentPosition,
      estimatedWaitTime,
      totalInQueue: queuedConsultations.length,
      activeConsultations: activeCount,
      queueJoinedAt: consultation.queueJoinedAt,
    };
  }

  async getDoctorQueue(doctorId: string) {
    // Get all queued consultations for this doctor
    const queuedConsultations = await this.consultationRepo.find({
      where: {
        doctor: { id: doctorId },
        status: ConsultationStatus.QUEUED,
      },
      relations: ['patient'],
      order: { queueJoinedAt: 'ASC' },
    });

    // Get active consultations
    const activeConsultations = await this.consultationRepo.find({
      where: {
        doctor: { id: doctorId },
        status: ConsultationStatus.IN_PROGRESS,
      },
      relations: ['patient'],
    });

    return {
      queued: queuedConsultations.map(c => ({
        consultationId: c.id,
        patientId: c.patient.id,
        patientName: `${c.patient.firstName} ${c.patient.lastName}`.trim(),
        chiefComplaint: c.chiefComplaint,
        urgencyLevel: c.urgencyLevel,
        queueJoinedAt: c.queueJoinedAt,
        estimatedWaitTime: c.estimatedWaitTime,
      })),
      active: activeConsultations.map(c => ({
        consultationId: c.id,
        patientId: c.patient.id,
        patientName: `${c.patient.firstName} ${c.patient.lastName}`.trim(),
        callStartedAt: c.callStartedAt,
      })),
    };
  }

  async startCall(consultationId: string, actorId?: string): Promise<Consultation> {
    const consultation = await this.findById(consultationId);
    
    if (consultation.status !== ConsultationStatus.QUEUED) {
      throw new BadRequestException('Consultation must be in queue to start call');
    }

    consultation.status = ConsultationStatus.IN_PROGRESS;
    consultation.callStartedAt = new Date();
    await this.consultationRepo.save(consultation);

    return consultation;
  }

  async endCall(
    consultationId: string,
    durationSeconds?: number,
    summary?: string,
    actorId?: string,
  ): Promise<Consultation> {
    const consultation = await this.findById(consultationId);
    
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

    await this.consultationRepo.save(consultation);

    return consultation;
  }

  async generateCallSummary(consultationId: string, transcript?: string) {
    const consultation = await this.findById(consultationId);
    
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
          patientName: `${consultation.patient.firstName} ${consultation.patient.lastName}`.trim(),
          doctorName: `${consultation.doctor.firstName} ${consultation.doctor.lastName}`.trim(),
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

    const summary = {
      consultationId: consultation.id,
      patient: {
        id: consultation.patient.id,
        name: `${consultation.patient.firstName} ${consultation.patient.lastName}`.trim(),
      },
      doctor: {
        id: consultation.doctor.id,
        name: `${consultation.doctor.firstName} ${consultation.doctor.lastName}`.trim(),
        specialty: consultation.doctor.role,
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

    return summary;
  }
}


import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueEntry, QueueStatus } from './entities/queue-entry.entity';
import { Consultation, ConsultationStatus } from '../consultations/entities/consultation.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(QueueEntry)
    private readonly queueRepo: Repository<QueueEntry>,
    @InjectRepository(Consultation)
    private readonly consultationRepo: Repository<Consultation>,
  ) {}

  async enqueueConsultation(consultationId: string) {
    const consultation = await this.consultationRepo.findOne({
      where: { id: consultationId },
      relations: ['doctor', 'patient'],
    });
    if (!consultation) throw new NotFoundException('Consultation not found');

    const existingEntry = await this.queueRepo.findOne({
      where: { consultation: { id: consultationId } },
    });
    if (existingEntry) {
      return existingEntry;
    }

    const count = await this.queueRepo
      .createQueryBuilder('queue')
      .leftJoin('queue.consultation', 'consultation')
      .leftJoin('consultation.doctor', 'doctor')
      .where('doctor.id = :doctorId', { doctorId: consultation.doctor.id })
      .andWhere('queue.status = :status', { status: QueueStatus.WAITING })
      .getCount();

    const entry = this.queueRepo.create({
      consultation,
      position: count + 1,
      joinedAt: new Date(),
      estimatedWaitTime: Math.max(5, (count + 1) * 3),
      status: QueueStatus.WAITING,
      urgencyLevel: consultation.urgencyLevel,
    });

    consultation.status = ConsultationStatus.QUEUED;
    consultation.queuePosition = entry.position;
    consultation.queueJoinedAt = entry.joinedAt;
    consultation.estimatedWaitTime = entry.estimatedWaitTime;

    await this.consultationRepo.save(consultation);
    return this.queueRepo.save(entry);
  }

  async getForConsultation(consultationId: string, user: User) {
    const entry = await this.queueRepo.findOne({
      where: { consultation: { id: consultationId } },
      relations: ['consultation', 'consultation.patient', 'consultation.doctor'],
    });
    if (!entry) {
      throw new NotFoundException('Queue entry not found');
    }
    if (entry.consultation.patient.id !== user.id) {
      throw new UnauthorizedException();
    }
    return entry;
  }

  async getDoctorQueue(doctorId: string) {
    return this.queueRepo
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.consultation', 'consultation')
      .leftJoinAndSelect('consultation.patient', 'patient')
      .leftJoinAndSelect('consultation.doctor', 'doctor')
      .where('doctor.id = :doctorId', { doctorId })
      .orderBy('queue.position', 'ASC')
      .getMany();
  }
}


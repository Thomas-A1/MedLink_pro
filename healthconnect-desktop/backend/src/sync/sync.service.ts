import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncEvent, SyncStatus } from './entities/sync-event.entity';
import { SyncSession } from './entities/sync-session.entity';
import { CreateSyncEventDto } from './dto/create-sync-event.dto';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(SyncEvent) private readonly eventRepo: Repository<SyncEvent>,
    @InjectRepository(SyncSession) private readonly sessionRepo: Repository<SyncSession>,
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
  ) {}

  async registerSession(userId: string, pharmacyId: string, clientVersion: string) {
    const pharmacy = await this.pharmacyRepo.findOne({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const session = this.sessionRepo.create({
      user: { id: userId } as any,
      pharmacy,
      clientVersion,
      hasConflicts: false,
    });

    return this.sessionRepo.save(session);
  }

  async enqueue(pharmacyId: string, dto: CreateSyncEventDto) {
    const pharmacy = await this.pharmacyRepo.findOne({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const event = this.eventRepo.create({
      ...dto,
      pharmacy,
    });
    return this.eventRepo.save(event);
  }

  async markSynced(eventId: string) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Sync event not found');
    }

    event.status = SyncStatus.SYNCED;
    event.syncedAt = new Date();
    return this.eventRepo.save(event);
  }

  async listPending(pharmacyId: string) {
    return this.eventRepo.find({
      where: { pharmacy: { id: pharmacyId }, status: SyncStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }
}

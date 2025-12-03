import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, ActivityResourceType } from './entities/activity-log.entity';
import { User } from '../common/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';

interface CreateActivityLogOptions {
  actor?: User | null;
  organization?: Organization | null;
  resourceType: ActivityResourceType;
  resourceId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepo: Repository<ActivityLog>,
  ) {}

  async record(options: CreateActivityLogOptions) {
    const log = this.activityRepo.create({
      actor: options.actor ?? null,
      organization: options.organization ?? null,
      resourceType: options.resourceType,
      resourceId: options.resourceId ?? null,
      action: options.action,
      metadata: options.metadata ?? {},
    });
    await this.activityRepo.save(log);
    return log;
  }

  async listForOrganization(
    organizationId: string,
    opts: {
      limit?: number;
      page?: number;
      actorId?: string;
      actorEmail?: string;
      from?: string;
      to?: string;
      resourceType?: string;
      action?: string;
      pharmacyId?: string;
      q?: string;
    } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(opts.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const qb = this.activityRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .where('log.organizationId = :organizationId', { organizationId })
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (opts.actorId) {
      qb.andWhere('actor.id = :actorId', { actorId: opts.actorId });
    }
    if (opts.actorEmail) {
      qb.andWhere('LOWER(actor.email) LIKE LOWER(:actorEmail)', { actorEmail: `%${opts.actorEmail}%` });
    }
    if (opts.from) {
      qb.andWhere('log.createdAt >= :from', { from: new Date(opts.from) });
    }
    if (opts.to) {
      const toDate = new Date(opts.to);
      toDate.setHours(23, 59, 59, 999);
      qb.andWhere('log.createdAt <= :to', { to: toDate });
    }
    if (opts.resourceType) {
      qb.andWhere('log.resourceType = :resourceType', { resourceType: opts.resourceType });
    }
    if (opts.action) {
      qb.andWhere('log.action ILIKE :action', { action: `%${opts.action}%` });
    }
    if (opts.pharmacyId) {
      // Filter by pharmacyId in multiple ways:
      // 1. Check metadata.pharmacyId (for most activity logs)
      // 2. Check resourceId when resourceType is PHARMACY (for pharmacy-specific actions)
      // This ensures we capture all activities related to a specific pharmacy
      qb.andWhere(
        `(
          log.metadata->>'pharmacyId' = :pharmacyId 
          OR CAST(log.metadata AS TEXT) LIKE :pharmacyIdPattern
          OR (log.resourceType = 'pharmacy' AND log.resourceId = :pharmacyId)
        )`,
        { 
          pharmacyId: opts.pharmacyId,
          pharmacyIdPattern: `%"pharmacyId":"${opts.pharmacyId}"%`
        }
      );
    }
    if (opts.q) {
      qb.andWhere(
        `(log.action ILIKE :q OR log.resourceId ILIKE :q OR CAST(log.metadata AS TEXT) ILIKE :q)`,
        { q: `%${opts.q}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}


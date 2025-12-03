import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pharmacy } from './entities/pharmacy.entity';
import { CreatePharmacyDto } from './dto/create-pharmacy.dto';
import { PharmacyStaff } from './entities/pharmacy-staff.entity';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { User } from '../common/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../common/enums/role.enum';
import { Organization, OrganizationType } from '../organizations/entities/organization.entity';
import { Point } from 'geojson';
import { PasswordTokensService } from '../auth/password-tokens.service';
import { PasswordTokenType } from '../auth/entities/password-token.entity';
import { ActivityService } from '../activity/activity.service';
import { ActivityResourceType } from '../activity/entities/activity-log.entity';

@Injectable()
export class PharmacyService {
  constructor(
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(PharmacyStaff) private readonly staffRepo: Repository<PharmacyStaff>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Organization) private readonly organizationRepo: Repository<Organization>,
    private readonly passwordTokensService: PasswordTokensService,
    private readonly activityService: ActivityService,
  ) {}

  async create(dto: CreatePharmacyDto, ownerId: string) {
    const owner = await this.userRepo.findOne({ where: { id: ownerId }, relations: ['organization'] });
    const locationPoint =
      typeof dto.latitude === 'number' && typeof dto.longitude === 'number'
        ? ({
            type: 'Point',
            coordinates: [dto.longitude, dto.latitude],
          } as Point)
        : undefined;

    const pharmacy = this.pharmacyRepo.create({
      name: dto.name,
      address: dto.address,
      region: dto.region,
      district: dto.district,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail,
      country: dto.country ?? '',
      latitude: dto.latitude,
      longitude: dto.longitude,
      location: locationPoint,
      isVerified: false,
      isPartner: true,
      organization: owner?.organization,
    });
    const saved = await this.pharmacyRepo.save(pharmacy);

    if (owner) {
      await this.staffRepo.save(
        this.staffRepo.create({
          pharmacy: saved,
          user: owner,
          role: UserRole.HOSPITAL_ADMIN,
          isPrimaryLocation: true,
        }),
      );
    }

    await this.activityService.record({
      actor: owner ?? undefined,
      organization: owner?.organization ?? null,
      resourceType: ActivityResourceType.PHARMACY,
      resourceId: saved.id,
      action: 'pharmacy.create',
      metadata: {
        pharmacyId: saved.id,
        name: dto.name,
        address: dto.address,
      },
    });

    return saved;
  }

  async listForUser(
    userId: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      address: string;
      region: string;
      district: string;
      contactPhone: string;
      contactEmail?: string | null;
      latitude: number | null;
      longitude: number | null;
      country: string | null;
      isVerified: boolean;
      isPartner: boolean;
      staff: Array<{
        id: string;
        role: UserRole;
        isPrimaryLocation: boolean;
      }>;
    }>
  > {
    const memberships = await this.staffRepo.find({
      where: { user: { id: userId } },
      relations: ['pharmacy'],
      order: { createdAt: 'ASC' },
    });

    if (!memberships.length) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user?.role === UserRole.HOSPITAL_ADMIN) {
        await this.seedDefaultPharmacy();
        return this.listForUser(userId);
      }
      return [];
    }

    return memberships.map((membership) => ({
      id: membership.pharmacy.id,
      name: membership.pharmacy.name,
      address: membership.pharmacy.address,
      region: membership.pharmacy.region,
      district: membership.pharmacy.district,
      contactPhone: membership.pharmacy.contactPhone,
      contactEmail: membership.pharmacy.contactEmail,
      latitude: membership.pharmacy.latitude ?? null,
      longitude: membership.pharmacy.longitude ?? null,
      country: membership.pharmacy.country ?? null,
      isVerified: membership.pharmacy.isVerified,
      isPartner: membership.pharmacy.isPartner,
      staff: [
        {
          id: membership.id,
          role: membership.role,
          isPrimaryLocation: membership.isPrimaryLocation,
        },
      ],
    }));
  }

  async inviteStaff(pharmacyId: string, dto: InviteStaffDto, actorId?: string) {
    const pharmacy = await this.pharmacyRepo.findOne({ where: { id: pharmacyId }, relations: ['organization'] });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    // Enforce employee email domain matches organization's domain
    const orgEmail = pharmacy.organization?.contactEmail ?? null;
    if (orgEmail) {
      const orgDomain = orgEmail.toLowerCase().split('@')[1];
      const staffDomain = (dto.email ?? '').toLowerCase().split('@')[1];
      if (!staffDomain || staffDomain !== orgDomain) {
        throw new BadRequestException(`Employee email must use the organization's domain (${orgDomain}).`);
      }
    }

    // Enforce global unique phone number
    const normalizedEmail = (dto.email ?? '').toLowerCase();
    const existingByPhone = await this.userRepo.findOne({ where: { phoneNumber: dto.phoneNumber } });
    if (existingByPhone && existingByPhone.email !== normalizedEmail) {
      throw new BadRequestException('Phone number already in use by another account. Please use a different phone number.');
    }

    let user = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      const passwordHash = await bcrypt.hash('TempPass!123', 10);
      user = this.userRepo.create({
        email: normalizedEmail,
        phoneNumber: dto.phoneNumber,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: dto.role,
        organization: pharmacy.organization,
      });
      await this.userRepo.save(user);
    }

    const existing = await this.staffRepo.findOne({
      where: { pharmacy: { id: pharmacyId }, user: { id: user.id } },
    });

    const actor = actorId ? await this.userRepo.findOne({ where: { id: actorId } }) : null;

    if (existing) {
      const inviteToken = await this.passwordTokensService.createToken(existing.user, PasswordTokenType.INVITE, 72 * 60);
      await this.activityService.record({
        actor: actor ?? undefined,
        organization: pharmacy.organization ?? null,
        resourceType: ActivityResourceType.AUTH,
        resourceId: existing.user.id,
        action: 'auth.invite.regenerate',
        metadata: {
          pharmacyId,
          staffId: existing.id,
        },
      });
      return {
        staff: existing,
        inviteToken,
      };
    }

    const staff = this.staffRepo.create({
      pharmacy,
      user,
      role: dto.role,
      isPrimaryLocation: false,
    });

    const savedStaff = await this.staffRepo.save(staff);
    const inviteToken = await this.passwordTokensService.createToken(
      user,
      PasswordTokenType.INVITE,
      72 * 60,
    );

    await this.activityService.record({
      actor: actor ?? undefined,
      organization: pharmacy.organization ?? null,
      resourceType: ActivityResourceType.AUTH,
      resourceId: user.id,
      action: 'auth.invite.create',
      metadata: {
        pharmacyId,
        staffId: savedStaff.id,
      },
    });

    return {
      staff: savedStaff,
      inviteToken,
    };
  }

  async listStaffMembers(pharmacyId: string) {
    const pharmacy = await this.pharmacyRepo.findOne({ where: { id: pharmacyId }, relations: ['organization'] });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const staff = await this.staffRepo.find({
      where: { pharmacy: { id: pharmacyId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return staff.map((membership) => ({
      id: membership.id,
      invitedAt: membership.createdAt,
      role: membership.role,
      isPrimaryLocation: membership.isPrimaryLocation,
      user: {
        id: membership.user.id,
        email: membership.user.email,
        firstName: membership.user.firstName ?? null,
        lastName: membership.user.lastName ?? null,
        phoneNumber: membership.user.phoneNumber,
        role: membership.user.role,
        isActive: membership.user.isActive,
      },
    }));
  }

  async removeStaff(pharmacyId: string, staffId: string, reason: string, actorId: string) {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException('Removal reason is required.');
    }

    const membership = await this.staffRepo.findOne({
      where: { id: staffId, pharmacy: { id: pharmacyId } },
      relations: ['user', 'pharmacy', 'pharmacy.organization'],
    });

    if (!membership) {
      throw new NotFoundException('Staff member not found');
    }

    // Prevent admin from removing themselves
    if (membership.user.id === actorId) {
      throw new BadRequestException('You cannot remove your own access. Please ask another admin to do this.');
    }

    membership.user.isActive = false;
    await this.userRepo.save(membership.user);
    await this.staffRepo.remove(membership);

    const actor = await this.userRepo.findOne({ where: { id: actorId } });

    await this.activityService.record({
      actor: actor ?? undefined,
      organization: membership.pharmacy.organization ?? null,
      resourceType: ActivityResourceType.PHARMACY,
      resourceId: membership.pharmacy.id,
      action: 'pharmacy.staff.remove',
      metadata: {
        pharmacyId,
        staffUserId: membership.user.id,
        staffEmail: membership.user.email,
        reason: trimmedReason,
      },
    });

    return {
      success: true,
    };
  }

  async seedDefaultPharmacy() {
    const existingCount = await this.pharmacyRepo.count();
    if (existingCount > 0) {
      const [existing] = await this.pharmacyRepo.find({
        order: { createdAt: 'ASC' },
        relations: ['organization'],
        take: 1,
      });

      if (existing) {
        const admin = await this.userRepo.findOne({ where: { role: UserRole.HOSPITAL_ADMIN } });
        if (admin) {
          if (!admin.organization && existing.organization) {
            admin.organization = existing.organization;
            await this.userRepo.save(admin);
          }
          const membership = await this.staffRepo.findOne({
            where: { pharmacy: { id: existing.id }, user: { id: admin.id } },
          });
          if (!membership) {
            await this.staffRepo.save(
              this.staffRepo.create({
                pharmacy: existing,
                user: admin,
                role: UserRole.HOSPITAL_ADMIN,
                isPrimaryLocation: true,
              }),
            );
          }
        }
      }

      return existing;
    }

    const admin = await this.userRepo.findOne({
      where: { role: UserRole.HOSPITAL_ADMIN },
      relations: ['organization'],
    });
    if (!admin) {
      return null;
    }

    let organization = admin.organization;
    if (!organization) {
      organization = this.organizationRepo.create({
        name: 'MedLink Central Pharma',
        slug: 'medlink-central',
        type: OrganizationType.PHARMACY,
        contactEmail: admin.email,
        contactPhone: admin.phoneNumber ?? '',
        timezone: 'Africa/Accra',
      });
      await this.organizationRepo.save(organization);
      admin.organization = organization;
      await this.userRepo.save(admin);
    }

    const seededLocation: Point = {
      type: 'Point',
      coordinates: [-0.1969, 5.55602],
    };

    const pharmacy = this.pharmacyRepo.create({
      name: 'MedLink Central Pharmacy',
      address: '12 Oxford Street, Osu',
      region: 'Greater Accra',
      district: 'Accra Metropolitan',
      contactPhone: '+233200000000',
      contactEmail: 'central@medlink.com',
      country: 'Ghana',
      isVerified: true,
      isPartner: true,
      latitude: 5.55602,
      longitude: -0.1969,
      location: seededLocation,
      organization,
    });

    const saved = await this.pharmacyRepo.save(pharmacy);

    await this.staffRepo.save(
      this.staffRepo.create({
        pharmacy: saved,
        user: admin,
        role: UserRole.HOSPITAL_ADMIN,
        isPrimaryLocation: true,
      }),
    );

    return saved;
  }
}

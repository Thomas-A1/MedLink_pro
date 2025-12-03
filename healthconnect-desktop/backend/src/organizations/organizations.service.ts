import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { Organization, OrganizationType } from './entities/organization.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { User } from '../common/entities/user.entity';
import { UserRole } from '../common/enums/role.enum';
import { PharmacyStaff } from '../pharmacy/entities/pharmacy-staff.entity';
import { Point } from 'geojson';
import { ActivityService } from '../activity/activity.service';
import { ActivityResourceType } from '../activity/entities/activity-log.entity';

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  contactEmail?: string;
  contactPhone?: string;
  timezone?: string;
  brandColor?: string;
  logoUrl?: string;
  createdAt: Date;
  settings?: Record<string, unknown> | null;
  primaryLocation?: {
    id: string;
    name: string;
    address: string;
    region: string;
    district: string;
    contactPhone: string;
    latitude?: number;
    longitude?: number;
    country?: string;
  };
  admin?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    temporaryPassword?: string;
  };
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization) private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PharmacyStaff) private readonly staffRepo: Repository<PharmacyStaff>,
    private readonly activityService: ActivityService,
  ) {}

  async listAll(): Promise<OrganizationResponse[]> {
    const organizations = await this.organizationRepo.find({
      relations: ['pharmacies'],
      order: { name: 'ASC' },
    });

    return organizations.map((org) => this.toResponse(org, org.pharmacies?.[0], undefined));
  }

  async create(dto: CreateOrganizationDto, actor?: { userId: string; role: UserRole; organizationId?: string | null }): Promise<OrganizationResponse> {
    const existing = await this.organizationRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException('Organization with this name already exists');
    }

    const slug = this.buildSlug(dto.name);

    const organization = this.organizationRepo.create({
      name: dto.name,
      slug,
      type: dto.type,
      timezone: dto.timezone,
      brandColor: dto.brandColor,
      logoUrl: dto.logoUrl ?? undefined,
      contactEmail: dto.adminEmail,
      contactPhone: dto.primaryLocationPhone,
      settings: {},
    });
    await this.organizationRepo.save(organization);

    const locationName = dto.primaryLocationName ?? `${dto.name} Main Branch`;
    const locationPoint: Point = {
      type: 'Point',
      coordinates: [dto.primaryLocationLongitude, dto.primaryLocationLatitude],
    };

    const pharmacy = this.pharmacyRepo.create({
      name: locationName,
      address: dto.primaryLocationAddress ?? 'Update address',
      region: dto.primaryLocationRegion ?? '',
      district: dto.primaryLocationDistrict ?? '',
      country: dto.primaryLocationCountry ?? '',
      contactPhone: dto.primaryLocationPhone ?? '',
      contactEmail: dto.adminEmail,
      isVerified: false,
      isPartner: true,
      latitude: dto.primaryLocationLatitude,
      longitude: dto.primaryLocationLongitude,
      location: locationPoint,
      organization,
    });
    await this.pharmacyRepo.save(pharmacy);

    const adminEmail = dto.adminEmail.toLowerCase();
    // Enforce global unique phone number
    if (dto.primaryLocationPhone) {
      const existingPhoneUser = await this.userRepo.findOne({ where: { phoneNumber: dto.primaryLocationPhone } });
      if (existingPhoneUser) {
        throw new BadRequestException('Phone number already in use by another account. Please use a different phone number.');
      }
    }
    let admin = await this.userRepo.findOne({ where: { email: adminEmail } });
    let temporaryPassword: string | undefined;

    if (!admin) {
      temporaryPassword = dto.adminPassword ?? `Temp#${randomBytes(3).toString('hex')}`;
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);
      admin = this.userRepo.create({
        email: adminEmail,
        phoneNumber: dto.primaryLocationPhone,
        passwordHash,
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        role: UserRole.HOSPITAL_ADMIN,
        organization,
      });
    } else {
      admin.organization = organization;
      admin.role = UserRole.HOSPITAL_ADMIN;
      if (admin.phoneNumber !== dto.primaryLocationPhone) {
        admin.phoneNumber = dto.primaryLocationPhone;
      }
    }
    await this.userRepo.save(admin);

    await this.staffRepo.save(
      this.staffRepo.create({
        pharmacy,
        user: admin,
        role: UserRole.HOSPITAL_ADMIN,
        isPrimaryLocation: true,
      }),
    );

    // Record activity
    await this.activityService.record({
      actor: actor ? await this.userRepo.findOne({ where: { id: actor.userId } }) : null,
      organization,
      resourceType: ActivityResourceType.ORGANIZATION,
      resourceId: organization.id,
      action: 'organization.create',
      metadata: {
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
        primaryLocationId: pharmacy.id,
        adminId: admin.id,
      },
    });

    return this.toResponse(organization, pharmacy, {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName ?? undefined,
      lastName: admin.lastName ?? undefined,
      temporaryPassword,
    });
  }

  async findOne(id: string): Promise<OrganizationResponse> {
    const organization = await this.organizationRepo.findOne({
      where: { id },
      relations: ['pharmacies'],
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    const primaryLocation = organization.pharmacies?.[0];
    const admin = await this.userRepo.findOne({
      where: { organization: { id }, role: UserRole.HOSPITAL_ADMIN },
      order: { createdAt: 'ASC' },
    });
    return this.toResponse(organization, primaryLocation, admin ? { id: admin.id, email: admin.email } : undefined);
  }

  private toResponse(
    org: Organization,
    pharmacy?: Pharmacy,
    admin?: { id: string; email: string; firstName?: string; lastName?: string; temporaryPassword?: string },
  ): OrganizationResponse {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      type: org.type,
      contactEmail: org.contactEmail ?? undefined,
      contactPhone: org.contactPhone ?? undefined,
      timezone: org.timezone ?? undefined,
      brandColor: org.brandColor ?? undefined,
      logoUrl: org.logoUrl ?? undefined,
      createdAt: org.createdAt,
      settings: org.settings ?? null,
      primaryLocation: pharmacy
        ? {
            id: pharmacy.id,
            name: pharmacy.name,
            address: pharmacy.address,
            region: pharmacy.region,
            district: pharmacy.district,
            contactPhone: pharmacy.contactPhone,
            latitude: pharmacy.latitude ?? undefined,
            longitude: pharmacy.longitude ?? undefined,
            country: pharmacy.country ?? undefined,
          }
        : undefined,
      admin: admin,
    };
  }

  private buildSlug(name: string) {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    return `${base}-${randomBytes(2).toString('hex')}`;
  }

  async update(
    organizationId: string,
    dto: UpdateOrganizationDto,
    actor?: { userId: string; role: UserRole; organizationId?: string | null },
  ): Promise<OrganizationResponse> {
    const organization = await this.organizationRepo.findOne({
      where: { id: organizationId },
      relations: ['pharmacies'],
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (dto.name && dto.name !== organization.name) {
      const existing = await this.organizationRepo.findOne({ where: { name: dto.name } });
      if (existing) {
        throw new BadRequestException('Organization with this name already exists');
      }
      organization.name = dto.name;
      organization.slug = this.buildSlug(dto.name);
    }

    if (dto.type) {
      organization.type = dto.type;
    }
    if (dto.timezone) {
      organization.timezone = dto.timezone;
    }
    if (dto.brandColor) {
      organization.brandColor = dto.brandColor;
    }
    if (dto.logoUrl !== undefined) {
      organization.logoUrl = dto.logoUrl || undefined;
    }
    if (dto.adminEmail) {
      organization.contactEmail = dto.adminEmail;
    }
    if (dto.primaryLocationPhone) {
      organization.contactPhone = dto.primaryLocationPhone;
    }

    await this.organizationRepo.save(organization);

    // Update primary pharmacy if location data provided
    const primaryPharmacy = organization.pharmacies?.[0];
    if (primaryPharmacy && (dto.primaryLocationName || dto.primaryLocationLatitude || dto.primaryLocationLongitude)) {
      if (dto.primaryLocationName) {
        primaryPharmacy.name = dto.primaryLocationName;
      }
      if (dto.primaryLocationAddress) {
        primaryPharmacy.address = dto.primaryLocationAddress;
      }
      if (dto.primaryLocationRegion) {
        primaryPharmacy.region = dto.primaryLocationRegion;
      }
      if (dto.primaryLocationDistrict) {
        primaryPharmacy.district = dto.primaryLocationDistrict;
      }
      if (dto.primaryLocationCountry) {
        primaryPharmacy.country = dto.primaryLocationCountry;
      }
      if (dto.primaryLocationPhone) {
        primaryPharmacy.contactPhone = dto.primaryLocationPhone;
      }
      if (dto.primaryLocationLatitude && dto.primaryLocationLongitude) {
        primaryPharmacy.latitude = dto.primaryLocationLatitude;
        primaryPharmacy.longitude = dto.primaryLocationLongitude;
        primaryPharmacy.location = {
          type: 'Point',
          coordinates: [dto.primaryLocationLongitude, dto.primaryLocationLatitude],
        };
      }
      await this.pharmacyRepo.save(primaryPharmacy);
    }

    // Update admin user if provided
    if (dto.adminEmail || dto.adminFirstName || dto.adminLastName) {
      const admin = await this.userRepo.findOne({
        where: { organization: { id: organization.id }, role: UserRole.HOSPITAL_ADMIN },
        order: { createdAt: 'ASC' },
      });
      if (admin) {
        if (dto.adminEmail) {
          admin.email = dto.adminEmail.toLowerCase();
        }
        if (dto.adminFirstName) {
          admin.firstName = dto.adminFirstName;
        }
        if (dto.adminLastName !== undefined) {
          admin.lastName = dto.adminLastName;
        }
        await this.userRepo.save(admin);
      }
    }

    // Refresh organization to get updated data
    const updatedOrg = await this.organizationRepo.findOne({
      where: { id: organizationId },
      relations: ['pharmacies'],
    });
    if (!updatedOrg) {
      throw new NotFoundException('Organization not found after update');
    }
    
    const primaryLocation = updatedOrg.pharmacies?.[0];
    const admin = await this.userRepo.findOne({
      where: { organization: { id: updatedOrg.id }, role: UserRole.HOSPITAL_ADMIN },
      order: { createdAt: 'ASC' },
    });

    // Record activity
    await this.activityService.record({
      actor: actor ? await this.userRepo.findOne({ where: { id: actor.userId } }) : null,
      organization: updatedOrg,
      resourceType: ActivityResourceType.ORGANIZATION,
      resourceId: updatedOrg.id,
      action: 'organization.update',
      metadata: {
        changes: Object.keys(dto),
      },
    });

    return this.toResponse(updatedOrg, primaryLocation, admin ? { id: admin.id, email: admin.email, firstName: admin.firstName ?? undefined, lastName: admin.lastName ?? undefined } : undefined);
  }

  async updateSettings(
    organizationId: string,
    dto: UpdateOrganizationSettingsDto,
    actor: { userId: string; role: UserRole; organizationId?: string | null },
  ): Promise<OrganizationResponse> {
    const organization = await this.organizationRepo.findOne({
      where: { id: organizationId },
      relations: ['pharmacies'],
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (actor.role !== UserRole.HOSPITAL_ADMIN || actor.organizationId !== organization.id) {
        throw new ForbiddenException('You are not allowed to modify this organization');
      }
    }

    const existingSettings = (organization.settings ?? {}) as Record<string, unknown>;
    const nextTheme = {
      ...(existingSettings.theme as Record<string, unknown> | undefined),
      ...(dto.themePrimaryColor ? { primary: dto.themePrimaryColor } : {}),
      ...(dto.themeAccentColor ? { accent: dto.themeAccentColor } : {}),
    };
    const nextFeatures = {
      ...(existingSettings.features as Record<string, unknown> | undefined),
      ...(dto.features ?? {}),
    };
    const existingIntegrations = (existingSettings.integrations as Record<string, unknown> | undefined) ?? {};
    const nextIntegrations = {
      ...existingIntegrations,
      ...(dto.paystackSubaccount ? { paystackSubaccount: dto.paystackSubaccount } : {}),
      ...(dto.settlementPhone ? { settlementPhone: dto.settlementPhone } : {}),
    };

    organization.settings = {
      ...existingSettings,
      ...(Object.keys(nextTheme).length ? { theme: nextTheme } : {}),
      ...(Object.keys(nextFeatures).length ? { features: nextFeatures } : {}),
      ...(Object.keys(nextIntegrations).length ? { integrations: nextIntegrations } : {}),
      ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
      ...(dto.tagline !== undefined ? { tagline: dto.tagline } : {}),
    };

    if (dto.brandColor) {
      organization.brandColor = dto.brandColor;
    }
    if (dto.timezone) {
      organization.timezone = dto.timezone;
    }
    if (dto.settlementPhone) {
      // Keep contact phone in sync if specified
      organization.contactPhone = dto.settlementPhone;
    }

    await this.organizationRepo.save(organization);

    const primaryLocation = organization.pharmacies?.[0];
    const admin = await this.userRepo.findOne({
      where: { organization: { id: organization.id }, role: UserRole.HOSPITAL_ADMIN },
      order: { createdAt: 'ASC' },
    });

    // Record activity
    await this.activityService.record({
      actor: await this.userRepo.findOne({ where: { id: actor.userId } }),
      organization,
      resourceType: ActivityResourceType.ORGANIZATION,
      resourceId: organization.id,
      action: 'organization.settings.update',
      metadata: {
        theme: {
          primary: (organization.settings as any)?.theme?.primary ?? null,
          accent: (organization.settings as any)?.theme?.accent ?? null,
        },
        brandColor: organization.brandColor ?? null,
        timezone: organization.timezone ?? null,
        integrations: (organization.settings as any)?.integrations ?? null,
      },
    });

    return this.toResponse(organization, primaryLocation, admin ? { id: admin.id, email: admin.email } : undefined);
  }

  async delete(organizationId: string, actor?: { userId: string; role: UserRole; organizationId?: string | null }): Promise<void> {
    const organization = await this.organizationRepo.findOne({
      where: { id: organizationId },
      relations: ['pharmacies', 'users'],
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Delete all related data (cascade will handle most, but we need to handle some explicitly)
    // Users will have organization_id set to NULL (ON DELETE SET NULL)
    // Pharmacies will be deleted (ON DELETE CASCADE)
    // Staff memberships will be deleted (ON DELETE CASCADE)
    
    await this.organizationRepo.remove(organization);

    // Record activity (note: organization is removed; log with metadata only)
    await this.activityService.record({
      actor: actor ? await this.userRepo.findOne({ where: { id: actor.userId } }) : null,
      organization: null,
      resourceType: ActivityResourceType.ORGANIZATION,
      resourceId: organizationId,
      action: 'organization.delete',
      metadata: {
        name: organization.name,
        slug: organization.slug,
      },
    });
  }
}


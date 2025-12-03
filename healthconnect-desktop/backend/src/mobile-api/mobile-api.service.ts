import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { Organization, OrganizationType } from '../organizations/entities/organization.entity';

@Injectable()
export class MobileApiService {
  constructor(
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
  ) {}

  /**
   * Get all pharmacies with location data for mobile app
   */
  async getPharmacies(): Promise<Pharmacy[]> {
    const allPharmacies = await this.pharmacyRepo.find({
      relations: ['organization'],
    });
    
    // Filter pharmacies with location data
    return allPharmacies.filter(
      (pharmacy) => pharmacy.latitude != null && pharmacy.longitude != null,
    );
  }

  /**
   * Get all hospitals (organizations with type='hospital') with their primary pharmacy location
   */
  async getHospitals(): Promise<Array<{
    id: string;
    name: string;
    contactPhone?: string;
    contactEmail?: string;
    primaryLocation: {
      address: string;
      region: string;
      district: string;
      contactPhone: string;
      contactEmail?: string;
      latitude: number;
      longitude: number;
      country?: string;
    } | null;
  }>> {
    const hospitals = await this.organizationRepo.find({
      where: {
        type: OrganizationType.HOSPITAL,
      },
      relations: ['pharmacies'],
    });

    return hospitals.map((hospital) => {
      const primaryPharmacy = hospital.pharmacies?.[0];
      return {
        id: hospital.id,
        name: hospital.name,
        contactPhone: hospital.contactPhone ?? undefined,
        contactEmail: hospital.contactEmail ?? undefined,
        primaryLocation: primaryPharmacy &&
          primaryPharmacy.latitude != null &&
          primaryPharmacy.longitude != null
          ? {
              address: primaryPharmacy.address,
              region: primaryPharmacy.region,
              district: primaryPharmacy.district,
              contactPhone: primaryPharmacy.contactPhone,
              contactEmail: primaryPharmacy.contactEmail ?? undefined,
              latitude: primaryPharmacy.latitude,
              longitude: primaryPharmacy.longitude,
              country: primaryPharmacy.country ?? undefined,
            }
          : null,
      };
    });
  }
}


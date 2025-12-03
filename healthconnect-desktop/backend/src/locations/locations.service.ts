import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { Organization, OrganizationType } from '../organizations/entities/organization.entity';

export interface LocationResult {
  id: string;
  name: string;
  address: string;
  phone?: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  // Additional fields for mobile app
  region?: string;
  district?: string;
  contactEmail?: string;
  country?: string;
  type?: 'pharmacy' | 'hospital';
  organizationId?: string;
  organizationName?: string;
  // Hospital specific
  hasEmergency?: boolean;
  hospitalType?: string;
  // Pharmacy specific
  isPartner?: boolean;
  rating?: number;
  isOpen?: boolean;
  openingHours?: string;
  imageUrl?: string;
  services?: string[];
}

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
  ) {}

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get pharmacies within radius
   */
  async getPharmacies(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ): Promise<LocationResult[]> {
    // Get all pharmacies and filter those with location data
    const pharmacies = await this.pharmacyRepo.find({
      relations: ['organization'],
    });

    const results: LocationResult[] = [];

    for (const pharmacy of pharmacies) {
      if (pharmacy.latitude == null || pharmacy.longitude == null) {
        continue;
      }

      const distance = this.calculateDistance(
        latitude,
        longitude,
        pharmacy.latitude,
        pharmacy.longitude,
      );

      if (distance <= radiusKm) {
        results.push({
          id: pharmacy.id,
          name: pharmacy.name,
          address: pharmacy.address,
          phone: pharmacy.contactPhone,
          latitude: pharmacy.latitude,
          longitude: pharmacy.longitude,
          distanceKm: distance,
          region: pharmacy.region,
          district: pharmacy.district,
          contactEmail: pharmacy.contactEmail ?? undefined,
          country: pharmacy.country ?? undefined,
          type: 'pharmacy',
          organizationId: pharmacy.organization?.id,
          organizationName: pharmacy.organization?.name,
          isPartner: pharmacy.isPartner,
          isOpen: true, // Default to open
        });
      }
    }

    // Sort by distance
    results.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

    return results;
  }

  /**
   * Get hospitals within radius
   * Hospitals are organizations with type='hospital' that have a primary pharmacy with location
   */
  async getHospitals(
    latitude: number,
    longitude: number,
    radiusKm: number,
    hasEmergency?: boolean,
  ): Promise<LocationResult[]> {
    // Get all hospital organizations with their pharmacies
    const hospitals = await this.organizationRepo.find({
      where: {
        type: OrganizationType.HOSPITAL,
      },
      relations: ['pharmacies'],
    });

    const results: LocationResult[] = [];

    for (const hospital of hospitals) {
      // Get the primary pharmacy (first one or the one marked as primary)
      const primaryPharmacy = hospital.pharmacies?.[0];
      
      if (!primaryPharmacy || primaryPharmacy.latitude == null || primaryPharmacy.longitude == null) {
        continue;
      }

      const distance = this.calculateDistance(
        latitude,
        longitude,
        primaryPharmacy.latitude,
        primaryPharmacy.longitude,
      );

      if (distance <= radiusKm) {
        results.push({
          id: hospital.id, // Use organization ID for hospitals
          name: hospital.name,
          address: primaryPharmacy.address,
          phone: primaryPharmacy.contactPhone || hospital.contactPhone || undefined,
          latitude: primaryPharmacy.latitude,
          longitude: primaryPharmacy.longitude,
          distanceKm: distance,
          region: primaryPharmacy.region,
          district: primaryPharmacy.district,
          contactEmail: (primaryPharmacy.contactEmail || hospital.contactEmail) ?? undefined,
          country: primaryPharmacy.country ?? undefined,
          type: 'hospital',
          organizationId: hospital.id,
          organizationName: hospital.name,
          hasEmergency: false, // Default, can be enhanced later
          isOpen: true, // Default to open
        });
      }
    }

    // Sort by distance
    results.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

    return results;
  }

  /**
   * Get all locations (pharmacies and hospitals) within radius
   */
  async getAllLocations(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ): Promise<{ pharmacies: LocationResult[]; hospitals: LocationResult[] }> {
    const [pharmacies, hospitals] = await Promise.all([
      this.getPharmacies(latitude, longitude, radiusKm),
      this.getHospitals(latitude, longitude, radiusKm),
    ]);

    return { pharmacies, hospitals };
  }
}


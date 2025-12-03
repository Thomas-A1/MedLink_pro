import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PharmacyInventory } from './entities/pharmacy-inventory.entity';
import { SearchDrugDto } from './dto/search-drug.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(PharmacyInventory)
    private readonly inventoryRepo: Repository<PharmacyInventory>,
  ) {}

  async searchDrug(dto: SearchDrugDto) {
    if (dto.pharmacy_id) {
      const available = await this.inventoryRepo
        .createQueryBuilder('inventory')
        .leftJoin('inventory.pharmacy', 'pharmacy')
        .leftJoin('inventory.drug', 'drug')
        .where('pharmacy.id = :pharmacyId', { pharmacyId: dto.pharmacy_id })
        .andWhere('LOWER(drug.name) LIKE :name', {
          name: `%${dto.drug_name.toLowerCase()}%`,
        })
        .andWhere('inventory.quantity > 0')
        .getExists();

      return {
        data: { available },
      };
    }

    const results = await this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.pharmacy', 'pharmacy')
      .leftJoinAndSelect('inventory.drug', 'drug')
      .where('inventory.quantity > 0')
      .andWhere('LOWER(drug.name) LIKE :name', {
        name: `%${dto.drug_name.toLowerCase()}%`,
      })
      .getMany();

    const mapped = results.map((item) => {
      const distanceKm =
        dto.latitude !== undefined && dto.longitude !== undefined
          ? this.calculateDistance(
              dto.latitude,
              dto.longitude,
              item.pharmacy.latitude,
              item.pharmacy.longitude,
            )
          : undefined;

      return {
        drugId: item.drug.id,
        drugName: item.drug.name,
        strength: item.drug.strength,
        dosage: item.dosage,
        quantityAvailable: item.quantity,
        price: item.price,
        pharmacyId: item.pharmacy.id,
        pharmacyName: item.pharmacy.name,
        pharmacyLatitude: item.pharmacy.latitude,
        pharmacyLongitude: item.pharmacy.longitude,
        distanceKm,
      };
    });

    const filtered =
      dto.radius && dto.latitude !== undefined && dto.longitude !== undefined
        ? mapped.filter((item) => (item.distanceKm ?? Infinity) <= dto.radius!)
        : mapped;

    return {
      data: {
        results: filtered,
      },
    };
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const earthRadius = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  private deg2rad(deg: number) {
    return (deg * Math.PI) / 180;
  }
}


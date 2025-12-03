import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PharmacyService, ServiceType } from './entities/pharmacy-service.entity';
import { Pharmacy } from './entities/pharmacy.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(PharmacyService)
    private readonly serviceRepo: Repository<PharmacyService>,
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
  ) {}

  async list(pharmacyId: string) {
    return this.serviceRepo.find({
      where: { pharmacy: { id: pharmacyId } },
      order: { name: 'ASC' },
    });
  }

  async create(pharmacyId: string, dto: CreateServiceDto) {
    const pharmacy = await this.pharmacyRepo.findOne({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const service = this.serviceRepo.create({
      ...dto,
      pharmacy,
    });
    return this.serviceRepo.save(service);
  }

  async update(pharmacyId: string, serviceId: string, dto: UpdateServiceDto) {
    const service = await this.serviceRepo.findOne({
      where: { id: serviceId, pharmacy: { id: pharmacyId } },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    Object.assign(service, dto);
    return this.serviceRepo.save(service);
  }

  async delete(pharmacyId: string, serviceId: string) {
    const service = await this.serviceRepo.findOne({
      where: { id: serviceId, pharmacy: { id: pharmacyId } },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    await this.serviceRepo.remove(service);
    return { message: 'Service deleted successfully' };
  }
}


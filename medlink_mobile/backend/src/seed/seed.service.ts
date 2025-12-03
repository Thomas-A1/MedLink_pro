import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Pharmacy } from '../locations/entities/pharmacy.entity';
import { Hospital } from '../locations/entities/hospital.entity';
import { Drug } from '../inventory/entities/drug.entity';
import { PharmacyInventory } from '../inventory/entities/pharmacy-inventory.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Doctor) private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(Hospital) private readonly hospitalRepo: Repository<Hospital>,
    @InjectRepository(Drug) private readonly drugRepo: Repository<Drug>,
    @InjectRepository(PharmacyInventory)
    private readonly inventoryRepo: Repository<PharmacyInventory>,
  ) {}

  async onModuleInit() {
    await this.seedDoctors();
    await this.seedLocations();
    await this.seedInventory();
  }

  private async seedDoctors() {
    const count = await this.doctorRepo.count();
    if (count > 0) return;

    const doctors = [
      {
        name: 'Dr. Akosua Boateng',
        specialty: 'general practitioner',
        facility: 'MedLink Virtual Clinic',
        rating: 4.9,
        reviewCount: 150,
        consultationFee: 50,
        waitTimeMinutes: 5,
        isOnline: true,
        languages: ['English', 'Twi'],
        experienceYears: 8,
      },
      {
        name: 'Dr. Kwesi Obeng',
        specialty: 'cardiologist',
        facility: 'Korle Bu Teaching Hospital',
        rating: 4.8,
        reviewCount: 89,
        consultationFee: 120,
        waitTimeMinutes: 15,
        isOnline: true,
        languages: ['English'],
        experienceYears: 12,
      },
      {
        name: 'Dr. Ama Serwaa',
        specialty: 'pediatrician',
        facility: 'Ridge Hospital',
        rating: 4.7,
        reviewCount: 203,
        consultationFee: 80,
        waitTimeMinutes: 10,
        isOnline: false,
        languages: ['English', 'Twi', 'Ga'],
        experienceYears: 10,
      },
    ];

    await this.doctorRepo.save(doctors);
    this.logger.log('Seeded doctors');
  }

  private async seedLocations() {
    const pharmacyCount = await this.pharmacyRepo.count();
    if (pharmacyCount === 0) {
      await this.pharmacyRepo.save([
        {
          name: 'MedLink Community Pharmacy',
          address: 'East Legon, Accra',
          phone: '+233200000001',
          latitude: 5.6303,
          longitude: -0.186964,
          isPartner: true,
          rating: 4.6,
          openingHours: '08:00 - 22:00',
          services: ['24/7 Service', 'Delivery', 'Vaccination'],
        },
        {
          name: 'Ayawaso Pharmacy',
          address: 'Madina, Accra',
          phone: '+233200000002',
          latitude: 5.6742,
          longitude: -0.161144,
          isPartner: false,
          rating: 4.3,
          openingHours: '07:00 - 21:00',
          services: ['Delivery'],
        },
      ]);
      this.logger.log('Seeded pharmacies');
    }

    const hospitalCount = await this.hospitalRepo.count();
    if (hospitalCount === 0) {
      await this.hospitalRepo.save([
        {
          name: 'Korle Bu Teaching Hospital',
          address: 'Korle Bu Rd, Accra',
          phone: '+233200000010',
          latitude: 5.5446,
          longitude: -0.2190,
          hasEmergency: true,
          hospitalType: 'Teaching',
          rating: 4.5,
          openingHours: '24/7',
          services: ['Emergency', 'Cardiology', 'Pediatrics'],
        },
        {
          name: 'Ridge Hospital',
          address: 'North Ridge, Accra',
          phone: '+233200000011',
          latitude: 5.5700,
          longitude: -0.1934,
          hasEmergency: true,
          hospitalType: 'General',
          rating: 4.2,
          openingHours: '24/7',
          services: ['Emergency', 'Maternity'],
        },
      ]);
      this.logger.log('Seeded hospitals');
    }
  }

  private async seedInventory() {
    const count = await this.inventoryRepo.count();
    if (count > 0) return;

    const pharmacies = await this.pharmacyRepo.find();
    if (!pharmacies.length) return;

    const paracetamol = this.drugRepo.create({
      name: 'Paracetamol',
      genericName: 'Acetaminophen',
      category: 'Analgesics',
      form: 'Tablet',
      strength: '500mg',
    });

    const amoxicillin = this.drugRepo.create({
      name: 'Amoxicillin',
      category: 'Antibiotics',
      form: 'Capsule',
      strength: '250mg',
    });

    await this.drugRepo.save([paracetamol, amoxicillin]);

    await this.inventoryRepo.save([
      {
        pharmacy: pharmacies[0],
        drug: paracetamol,
        quantity: 500,
        price: 2.5,
      },
      {
        pharmacy: pharmacies[0],
        drug: amoxicillin,
        quantity: 150,
        price: 5,
      },
      {
        pharmacy: pharmacies[1],
        drug: paracetamol,
        quantity: 300,
        price: 2.8,
      },
    ]);

    this.logger.log('Seeded inventory');
  }
}


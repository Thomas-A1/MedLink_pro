import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './entities/doctor.entity';
import { SearchDoctorsDto } from './dto/search-doctors.dto';
import { ReviewsService } from '../reviews/reviews.service';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor) private readonly doctorRepo: Repository<Doctor>,
    private readonly reviewsService: ReviewsService,
  ) {}

  async searchDoctors(query: SearchDoctorsDto) {
    let doctors = await this.doctorRepo.find();

    if (query.search) {
      const search = query.search.toLowerCase();
      doctors = doctors.filter(
        (doctor) =>
          doctor.name.toLowerCase().includes(search) ||
          doctor.specialty.toLowerCase().includes(search) ||
          doctor.facility.toLowerCase().includes(search),
      );
    }

    if (query.specialty) {
      const specialty = query.specialty.toLowerCase();
      doctors = doctors.filter(
        (doctor) => doctor.specialty.toLowerCase() === specialty,
      );
    }

    if (query.isOnline !== undefined) {
      doctors = doctors.filter((doctor) => doctor.isOnline === query.isOnline);
    }

    if (query.maxFee !== undefined) {
      doctors = doctors.filter((doctor) => doctor.consultationFee <= query.maxFee!);
    }

    // Ensure rating data is up to date for each doctor
    for (const doctor of doctors) {
      const ratingData = await this.reviewsService.getDoctorRating(doctor.id);
      if (doctor.rating !== ratingData.rating || doctor.reviewCount !== ratingData.reviewCount) {
        await this.doctorRepo.update(doctor.id, {
          rating: ratingData.rating,
          reviewCount: ratingData.reviewCount,
        });
        doctor.rating = ratingData.rating;
        doctor.reviewCount = ratingData.reviewCount;
      }
    }

    return doctors;
  }

  async findOne(id: string) {
    const doctor = await this.doctorRepo.findOne({ where: { id } });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Update rating data
    const ratingData = await this.reviewsService.getDoctorRating(id);
    if (doctor.rating !== ratingData.rating || doctor.reviewCount !== ratingData.reviewCount) {
      await this.doctorRepo.update(id, {
        rating: ratingData.rating,
        reviewCount: ratingData.reviewCount,
      });
      doctor.rating = ratingData.rating;
      doctor.reviewCount = ratingData.reviewCount;
    }

    return doctor;
  }
}


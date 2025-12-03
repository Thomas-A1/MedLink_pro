import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { Consultation, ConsultationStatus } from '../consultations/entities/consultation.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Consultation)
    private readonly consultationRepo: Repository<Consultation>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  async createReview(patientId: string, doctorId: string, dto: CreateReviewDto): Promise<Review> {
    // Verify consultation exists and belongs to patient
    const consultation = await this.consultationRepo.findOne({
      where: { id: dto.consultationId },
      relations: ['patient', 'doctor'],
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (consultation.patient.id !== patientId) {
      throw new UnauthorizedException('Not authorized to review this consultation');
    }

    if (consultation.doctor.id !== doctorId) {
      throw new BadRequestException('Consultation does not match doctor');
    }

    if (consultation.status !== ConsultationStatus.COMPLETED) {
      throw new BadRequestException('Can only review completed consultations');
    }

    // Check if review already exists for this consultation
    const existingReview = await this.reviewRepo.findOne({
      where: { consultation: { id: dto.consultationId } },
    });

    if (existingReview) {
      throw new BadRequestException('Review already exists for this consultation');
    }

    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const patient = consultation.patient;

    // Create review
    const review = this.reviewRepo.create({
      doctor,
      patient,
      consultation,
      rating: dto.rating,
      comment: dto.comment,
      isVerified: true, // Verified because it's from a completed consultation
      isVisible: true,
    });

    const savedReview = await this.reviewRepo.save(review);

    // Update doctor's average rating
    await this.updateDoctorRating(doctorId);

    return savedReview;
  }

  async getDoctorReviews(doctorId: string, limit = 10, offset = 0) {
    const [reviews, total] = await this.reviewRepo.findAndCount({
      where: {
        doctor: { id: doctorId },
        isVisible: true,
      },
      relations: ['patient'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        patientName: `${r.patient.firstName ?? ''} ${r.patient.lastName ?? ''}`.trim() || 'Anonymous',
        createdAt: r.createdAt,
        isVerified: r.isVerified,
      })),
      total,
      limit,
      offset,
    };
  }

  async getDoctorRating(doctorId: string) {
    const result = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'averageRating')
      .addSelect('COUNT(review.id)', 'totalReviews')
      .where('review.doctor.id = :doctorId', { doctorId })
      .andWhere('review.isVisible = :isVisible', { isVisible: true })
      .getRawOne();

    const averageRating = result?.averageRating ? parseFloat(result.averageRating) : 0;
    const totalReviews = result?.totalReviews ? parseInt(result.totalReviews, 10) : 0;

    return {
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      reviewCount: totalReviews,
    };
  }

  private async updateDoctorRating(doctorId: string) {
    const ratingData = await this.getDoctorRating(doctorId);
    
    await this.doctorRepo.update(doctorId, {
      rating: ratingData.rating,
      reviewCount: ratingData.reviewCount,
    });
  }
}


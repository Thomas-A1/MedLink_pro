import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('doctors/:doctorId')
  async createReview(
    @Param('doctorId') doctorId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: User,
  ) {
    const review = await this.reviewsService.createReview(user.id, doctorId, dto);
    return {
      data: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      },
    };
  }

  @Get('doctors/:doctorId')
  async getDoctorReviews(
    @Param('doctorId') doctorId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const reviews = await this.reviewsService.getDoctorReviews(
      doctorId,
      limit ? parseInt(limit, 10) : 10,
      offset ? parseInt(offset, 10) : 0,
    );
    return { data: reviews };
  }

  @Get('doctors/:doctorId/rating')
  async getDoctorRating(@Param('doctorId') doctorId: string) {
    const rating = await this.reviewsService.getDoctorRating(doctorId);
    return { data: rating };
  }
}


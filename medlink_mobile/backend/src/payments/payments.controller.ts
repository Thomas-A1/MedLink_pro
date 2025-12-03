import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ChargeDto } from './dto/charge.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('charge')
  async charge(@CurrentUser() user: User, @Body() dto: ChargeDto) {
    const result = await this.paymentsService.charge(user, dto);
    return {
      data: {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
      },
    };
  }

  @Get('verify/:reference')
  async verify(@Param('reference') reference: string) {
    const result = await this.paymentsService.verifyPayment(reference);
    return { data: result };
  }
}


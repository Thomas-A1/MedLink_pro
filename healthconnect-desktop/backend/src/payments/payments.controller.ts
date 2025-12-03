import { Body, Controller, Get, Headers, Param, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChargeConsultationDto } from '../consultations/dto/charge-consultation.dto';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('pharmacies/:pharmacyId/payments/paystack/initialize')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.PHARMACIST, UserRole.CLERK, UserRole.HOSPITAL_ADMIN)
  initiate(
    @Param('pharmacyId') pharmacyId: string,
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.initiate(pharmacyId, dto, user?.userId);
  }

  @Post('payments/charge')
  @UseGuards(JwtAccessGuard)
  async chargeConsultation(
    @Body() dto: ChargeConsultationDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.chargeConsultation(dto, user?.userId);
  }

  @Get('payments/verify/:reference')
  @UseGuards(JwtAccessGuard)
  async verifyPayment(@Param('reference') reference: string) {
    return this.paymentsService.verifyPayment(reference);
  }

  // Paystack requires raw body for signature validation
  @Post('integrations/paystack/webhook')
  async webhook(
    @Headers('x-paystack-signature') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const raw = (req as any).rawBody?.toString?.() ?? JSON.stringify(req.body ?? {});
    return this.paymentsService.handlePaystackWebhook(signature, raw);
  }
}



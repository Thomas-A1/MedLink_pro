import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { FulfilPrescriptionDto } from './dto/fulfil-prescription.dto';
import { AssignPrescriptionDto } from './dto/assign-prescription.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdatePrescriptionStatusDto } from './dto/update-prescription-status.dto';

@Controller('pharmacies/:pharmacyId/prescriptions')
@UseGuards(JwtAccessGuard, RolesGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get('open')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.PHARMACIST, UserRole.CLERK)
  list(@Param('pharmacyId') pharmacyId: string) {
    return this.prescriptionsService.listOpen(pharmacyId);
  }

  @Post(':prescriptionId/assign')
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN)
  assign(
    @Param('pharmacyId') pharmacyId: string,
    @Param('prescriptionId') prescriptionId: string,
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.assign(pharmacyId, prescriptionId, user.userId);
  }

  @Post('assign-by-code')
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN)
  assignByCode(
    @Param('pharmacyId') pharmacyId: string,
    @Body() dto: AssignPrescriptionDto,
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.assignByVerificationCode(pharmacyId, dto.verificationCode, user.userId);
  }

  @Post(':prescriptionId/fulfil')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.PHARMACIST)
  fulfil(
    @Param('pharmacyId') pharmacyId: string,
    @Param('prescriptionId') prescriptionId: string,
    @Body() dto: FulfilPrescriptionDto,
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.fulfil(pharmacyId, prescriptionId, dto, user.userId);
  }

  @Patch(':prescriptionId/status')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.PHARMACIST)
  updateStatus(
    @Param('pharmacyId') pharmacyId: string,
    @Param('prescriptionId') prescriptionId: string,
    @Body() dto: UpdatePrescriptionStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.updateStatus(pharmacyId, prescriptionId, dto, user.userId);
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { CreatePharmacyDto } from './dto/create-pharmacy.dto';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { RemoveStaffDto } from './dto/remove-staff.dto';

@Controller('pharmacies')
@UseGuards(JwtAccessGuard, RolesGuard)
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Post()
  @Roles(UserRole.HOSPITAL_ADMIN)
  create(@Body() dto: CreatePharmacyDto, @CurrentUser() user: any) {
    return this.pharmacyService.create(dto, user.userId);
  }

  @Get('me')
  listForUser(@CurrentUser() user: any) {
    return this.pharmacyService.listForUser(user.userId);
  }

  @Post(':pharmacyId/invite')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.PHARMACIST)
  invite(
    @Param('pharmacyId') pharmacyId: string,
    @Body() dto: InviteStaffDto,
    @CurrentUser() user: any,
  ) {
    return this.pharmacyService.inviteStaff(pharmacyId, dto, user.userId);
  }

  @Get(':pharmacyId/staff')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  listStaff(@Param('pharmacyId') pharmacyId: string) {
    return this.pharmacyService.listStaffMembers(pharmacyId);
  }

  @Post(':pharmacyId/staff/:staffId/remove')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  removeStaff(
    @Param('pharmacyId') pharmacyId: string,
    @Param('staffId') staffId: string,
    @Body() dto: RemoveStaffDto,
    @CurrentUser() user: any,
  ) {
    return this.pharmacyService.removeStaff(pharmacyId, staffId, dto.reason, user.userId);
  }
}

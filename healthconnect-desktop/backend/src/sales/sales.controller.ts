import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('pharmacies/:pharmacyId/sales')
@UseGuards(JwtAccessGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN, UserRole.CLERK)
  list(@Param('pharmacyId') pharmacyId: string) {
    return this.salesService.list(pharmacyId);
  }

  @Post()
  @Roles(UserRole.PHARMACIST, UserRole.CLERK, UserRole.HOSPITAL_ADMIN)
  create(
    @Param('pharmacyId') pharmacyId: string,
    @Body() dto: CreateSaleDto,
    @CurrentUser() user: any,
  ) {
    return this.salesService.create(pharmacyId, dto, user.userId);
  }

  @Get('low-stock')
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN)
  getLowStockItems(@Param('pharmacyId') pharmacyId: string) {
    return this.salesService.getLowStockItems(pharmacyId);
  }
}


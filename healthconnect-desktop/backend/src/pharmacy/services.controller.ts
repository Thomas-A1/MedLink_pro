import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';

@Controller('pharmacies/:pharmacyId/services')
@UseGuards(JwtAccessGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN, UserRole.CLERK)
  list(@Param('pharmacyId') pharmacyId: string) {
    return this.servicesService.list(pharmacyId);
  }

  @Post()
  @Roles(UserRole.HOSPITAL_ADMIN)
  create(@Param('pharmacyId') pharmacyId: string, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(pharmacyId, dto);
  }

  @Patch(':serviceId')
  @Roles(UserRole.HOSPITAL_ADMIN)
  update(
    @Param('pharmacyId') pharmacyId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(pharmacyId, serviceId, dto);
  }

  @Delete(':serviceId')
  @Roles(UserRole.HOSPITAL_ADMIN)
  delete(@Param('pharmacyId') pharmacyId: string, @Param('serviceId') serviceId: string) {
    return this.servicesService.delete(pharmacyId, serviceId);
  }
}


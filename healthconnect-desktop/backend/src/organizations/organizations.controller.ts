import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { OrganizationsService, OrganizationResponse } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('organizations')
@UseGuards(JwtAccessGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  findAll(): Promise<OrganizationResponse[]> {
    return this.organizationsService.listAll();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: any): Promise<OrganizationResponse> {
    return this.organizationsService.create(dto, {
      userId: user.userId,
      role: user.role,
      organizationId: user.organizationId ?? null,
    });
  }

  // More specific routes should come before parameterized routes
  @Patch(':id/settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)
  updateSettings(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationSettingsDto,
    @CurrentUser() user: any,
  ): Promise<OrganizationResponse> {
    return this.organizationsService.updateSettings(id, dto, {
      userId: user.userId,
      role: user.role,
      organizationId: user.organizationId ?? null,
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN)
  findOne(@Param('id') id: string): Promise<OrganizationResponse> {
    return this.organizationsService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto, @CurrentUser() user: any): Promise<OrganizationResponse> {
    return this.organizationsService.update(id, dto, {
      userId: user.userId,
      role: user.role,
      organizationId: user.organizationId ?? null,
    });
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async delete(@Param('id') id: string, @CurrentUser() user: any): Promise<{ message: string }> {
    await this.organizationsService.delete(id, {
      userId: user.userId,
      role: user.role,
      organizationId: user.organizationId ?? null,
    });
    return { message: 'Organization deleted successfully' };
  }
}


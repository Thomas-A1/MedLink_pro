import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { SyncInventoryDto } from './dto/sync-inventory.dto';
import { StockUpdateDto } from './dto/stock-update.dto';
import { IntegrationInventoryQueryDto } from './dto/list-inventory.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('integration/pharmacies/:pharmacyId')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post('inventory/sync')
  async syncInventory(
    @Param('pharmacyId') pharmacyId: string,
    @Body() dto: SyncInventoryDto,
    @CurrentUser() user: any,
  ) {
    return this.integrationService.syncInventory(pharmacyId, dto, user.userId, user.role);
  }

  @Post('inventory/stock-update')
  async stockUpdate(
    @Param('pharmacyId') pharmacyId: string,
    @Body() dto: StockUpdateDto,
    @CurrentUser() user: any,
  ) {
    return this.integrationService.applyStockUpdate(pharmacyId, dto, user.userId);
  }

  @Get('inventory')
  async listInventory(
    @Param('pharmacyId') pharmacyId: string,
    @Query() query: IntegrationInventoryQueryDto,
  ) {
    return this.integrationService.listInventory(pharmacyId, query);
  }
}



import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateInventoryBatchDto } from './dto/create-batch.dto';
import { ImportInventoryDto } from './dto/import-inventory.dto';

@Controller('pharmacies/:pharmacyId/inventory')
@UseGuards(JwtAccessGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async list(@Param('pharmacyId') pharmacyId: string) {
    return this.inventoryService.list(pharmacyId);
  }

  @Post()
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN)
  async create(
    @Param('pharmacyId') pharmacyId: string,
    @Body() dto: CreateInventoryItemDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.create(pharmacyId, dto, user.userId);
  }

  @Patch(':itemId')
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN)
  async update(
    @Param('pharmacyId') pharmacyId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInventoryItemDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.update(pharmacyId, itemId, dto, user.userId, user.role);
  }

  @Delete(':itemId')
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN)
  async remove(
    @Param('pharmacyId') pharmacyId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.delete(pharmacyId, itemId, user.userId, user.role);
  }

  @Post(':itemId/adjust')
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN)
  async adjust(
    @Param('pharmacyId') pharmacyId: string,
    @Param('itemId') itemId: string,
    @Body() dto: AdjustInventoryDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.adjustQuantity(
      pharmacyId,
      itemId,
      dto.quantityDelta,
      dto.movementType,
      user.userId,
      dto.notes,
    );
  }

  @Get(':itemId/movements')
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN)
  async listMovements(@Param('pharmacyId') pharmacyId: string, @Param('itemId') itemId: string) {
    return this.inventoryService.getMovements(pharmacyId, itemId);
  }

  @Get(':itemId/batches')
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN)
  async listBatches(@Param('pharmacyId') pharmacyId: string, @Param('itemId') itemId: string) {
    return this.inventoryService.listBatches(pharmacyId, itemId);
  }

  @Post(':itemId/batches')
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN)
  async addBatch(
    @Param('pharmacyId') pharmacyId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CreateInventoryBatchDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.addBatch(pharmacyId, itemId, dto, user.userId);
  }

  @Post('import')
  @Roles(UserRole.HOSPITAL_ADMIN)
  async importInventory(
    @Param('pharmacyId') pharmacyId: string,
    @Body() dto: ImportInventoryDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.importInventory(pharmacyId, dto, user.userId);
  }

  @Get('export')
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN)
  async exportInventory(@Param('pharmacyId') pharmacyId: string, @Res() res: Response) {
    const csv = await this.inventoryService.exportInventory(pharmacyId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="inventory-${pharmacyId}.csv"`);
    res.send(csv);
  }
}

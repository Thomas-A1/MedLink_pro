import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { QueueStatus } from './entities/queue-entry.entity';
import { CreateQueueEntryDto } from './dto/create-queue-entry.dto';
import { QueueEntryResponse } from './dto/queue-entry-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('pharmacies/:pharmacyId/queue')
@UseGuards(JwtAccessGuard, RolesGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.PHARMACIST, UserRole.CLERK)
  list(@Param('pharmacyId') pharmacyId: string): Promise<QueueEntryResponse[]> {
    return this.queueService.list(pharmacyId);
  }

  @Post()
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.PHARMACIST, UserRole.CLERK)
  enqueue(
    @Param('pharmacyId') pharmacyId: string,
    @Body() dto: CreateQueueEntryDto,
    @CurrentUser() user: any,
  ): Promise<QueueEntryResponse> {
    return this.queueService.enqueue(pharmacyId, dto, user.userId);
  }

  @Patch(':entryId')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.PHARMACIST, UserRole.CLERK)
  updateStatus(
    @Param('pharmacyId') pharmacyId: string,
    @Param('entryId') entryId: string,
    @Body('status') status: QueueStatus,
    @CurrentUser() user: any,
  ): Promise<QueueEntryResponse> {
    return this.queueService.updateStatus(entryId, status, user.userId);
  }
}

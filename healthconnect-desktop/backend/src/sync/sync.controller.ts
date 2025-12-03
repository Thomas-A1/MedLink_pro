import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CreateSyncEventDto } from './dto/create-sync-event.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('pharmacies/:pharmacyId/sync')
@UseGuards(JwtAccessGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('sessions')
  createSession(
    @Param('pharmacyId') pharmacyId: string,
    @Body('clientVersion') clientVersion: string,
    @CurrentUser() user: any,
  ) {
    return this.syncService.registerSession(user.userId, pharmacyId, clientVersion);
  }

  @Get('events/pending')
  listPending(@Param('pharmacyId') pharmacyId: string) {
    return this.syncService.listPending(pharmacyId);
  }

  @Post('events')
  enqueue(@Param('pharmacyId') pharmacyId: string, @Body() dto: CreateSyncEventDto) {
    return this.syncService.enqueue(pharmacyId, dto);
  }

  @Patch('events/:eventId/synced')
  markSynced(@Param('eventId') eventId: string) {
    return this.syncService.markSynced(eventId);
  }
}

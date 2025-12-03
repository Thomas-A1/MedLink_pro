import { Controller, Get, Param, Post, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { BackupsService } from './backups.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { BackupType } from './entities/backup-record.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('pharmacies/:pharmacyId/backups')
@UseGuards(JwtAccessGuard, RolesGuard)
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  list(@Param('pharmacyId') pharmacyId: string) {
    return this.backupsService.list(pharmacyId);
  }

  @Post()
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  create(@Param('pharmacyId') pharmacyId: string, @CurrentUser() user: any) {
    return this.backupsService.create(pharmacyId, BackupType.MANUAL, user.userId);
  }

  @Get(':backupId/download')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  async download(
    @Param('pharmacyId') pharmacyId: string,
    @Param('backupId') backupId: string,
    @Res() res: Response,
  ) {
    const { filename, buffer } = await this.backupsService.download(pharmacyId, backupId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post(':backupId/restore')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  restore(
    @Param('pharmacyId') pharmacyId: string,
    @Param('backupId') backupId: string,
    @CurrentUser() user: any,
  ) {
    return this.backupsService.restore(pharmacyId, backupId, user.userId);
  }

  @Post(':backupId/delete')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  delete(
    @Param('pharmacyId') pharmacyId: string,
    @Param('backupId') backupId: string,
    @CurrentUser() user: any,
  ) {
    return this.backupsService.delete(pharmacyId, backupId, user.userId);
  }
}



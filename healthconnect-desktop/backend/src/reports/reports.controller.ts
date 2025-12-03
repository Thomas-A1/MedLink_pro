import { Controller, Get, Param, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { ReportQueryDto, ExportReportQueryDto } from './dto/report-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('pharmacies/:pharmacyId/reports')
@UseGuards(JwtAccessGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  async getOverview(@Param('pharmacyId') pharmacyId: string, @Query() query: ReportQueryDto) {
    return this.reportsService.getOverview(pharmacyId, query);
  }

  @Get('export')
  @Roles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  async exportReport(
    @Param('pharmacyId') pharmacyId: string,
    @Query() query: ExportReportQueryDto,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { filename, mimeType, buffer } = await this.reportsService.export(pharmacyId, query, user.userId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}



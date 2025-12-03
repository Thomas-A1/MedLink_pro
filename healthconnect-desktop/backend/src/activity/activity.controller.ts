import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';

@Controller('activity')
@UseGuards(JwtAccessGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query('organizationId') organizationId?: string,
    @Query('limit') limitQuery?: string,
    @Query('page') pageQuery?: string,
    @Query('actorId') actorId?: string,
    @Query('actorEmail') actorEmail?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('resourceType') resourceType?: string,
    @Query('action') action?: string,
    @Query('pharmacyId') pharmacyId?: string,
    @Query('q') q?: string,
  ) {
    const limit = Math.min(Number(limitQuery ?? 50) || 50, 200);
    const page = Number(pageQuery ?? 1) || 1;
    if (user.role === UserRole.SUPER_ADMIN) {
      const orgId = organizationId ?? user.organizationId ?? null;
      if (!orgId) {
        return { items: [], total: 0, page: 1, limit, totalPages: 0 };
      }
      return this.activityService.listForOrganization(orgId, {
        limit,
        page,
        actorId,
        actorEmail,
        from,
        to,
        resourceType,
        action,
        pharmacyId,
        q,
      });
    }

    if (!user.organizationId) {
      return { items: [], total: 0, page: 1, limit, totalPages: 0 };
    }
    // For non-super admins, force logs to their organization;
    // if actorId provided, it must belong to same org (enforced at query by org filter).
    return this.activityService.listForOrganization(user.organizationId, {
      limit,
      page,
      actorId,
      actorEmail,
      from,
      to,
      resourceType,
      action,
      pharmacyId,
      q,
    });
  }
}


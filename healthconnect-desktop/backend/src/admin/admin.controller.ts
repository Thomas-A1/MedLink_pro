import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Danger: wipes all data from the database except the SuperAdmin user.
   * This endpoint is restricted to SUPER_ADMIN and should only be enabled in non-production environments.
   */
  @Post('reset-database')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetDatabase(@Body('confirm') confirm: string): Promise<void> {
    if (confirm !== 'RESET_ALL_DATA') {
      // Simple guard to avoid accidental calls
      throw new Error('Confirmation phrase does not match. Refusing to reset database.');
    }
    await this.adminService.resetDatabaseKeepingSuperAdmin();
  }
}



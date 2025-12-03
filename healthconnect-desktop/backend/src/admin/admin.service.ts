import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { UserRole } from '../common/enums/role.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Erase all data from the database except the SuperAdmin user.
   * Uses raw SQL to keep things explicit and efficient.
   * This should only be used in development / testing environments.
   */
  async resetDatabaseKeepingSuperAdmin(): Promise<void> {
    const superAdmin = await this.userRepo.findOne({
      where: { role: UserRole.SUPER_ADMIN },
    });

    if (!superAdmin) {
      throw new Error('SuperAdmin user not found; aborting reset.');
    }

    const manager = this.userRepo.manager;

    await manager.transaction(async (queryRunner) => {
      const qr = queryRunner;

      // Delete child tables first to satisfy FK constraints
      await qr.query(`DELETE FROM "queue_entries";`);
      await qr.query(`DELETE FROM "sync_events";`);
      await qr.query(`DELETE FROM "sync_sessions";`);
      await qr.query(`DELETE FROM "prescription_medications";`);
      await qr.query(`DELETE FROM "prescriptions";`);
      await qr.query(`DELETE FROM "stock_movements";`);
      await qr.query(`DELETE FROM "inventory_items";`);
      await qr.query(`DELETE FROM "pharmacy_staff";`);
      await qr.query(`DELETE FROM "pharmacies";`);

      // Delete all users except the SuperAdmin
      await qr.query(
        `DELETE FROM "users" WHERE "id" <> $1;`,
        [superAdmin.id],
      );

      // Finally delete all organizations
      await qr.query(`DELETE FROM "organizations";`);
    });
  }
}



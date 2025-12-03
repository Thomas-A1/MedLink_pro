import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtpFields1700000000102 implements MigrationInterface {
  name = 'AddOtpFields1700000000102';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mobile_users"
      ADD COLUMN "otp_code" VARCHAR(6),
      ADD COLUMN "otp_expires_at" TIMESTAMP,
      ADD COLUMN "phone_verified" BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mobile_users"
      DROP COLUMN "phone_verified",
      DROP COLUMN "otp_expires_at",
      DROP COLUMN "otp_code"
    `);
  }
}


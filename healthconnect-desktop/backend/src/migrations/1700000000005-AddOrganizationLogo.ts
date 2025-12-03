import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationLogo1700000000005 implements MigrationInterface {
  name = 'AddOrganizationLogo1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations"
      ADD COLUMN "logo_url" character varying(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations"
      DROP COLUMN "logo_url"
    `);
  }
}


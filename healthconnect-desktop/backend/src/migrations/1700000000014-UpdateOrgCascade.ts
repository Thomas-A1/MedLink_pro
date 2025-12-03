import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOrgCascade1700000000014 implements MigrationInterface {
  name = 'UpdateOrgCascade1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change users.organization_id FK to ON DELETE CASCADE
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT IF EXISTS "FK_users_organization";
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_organization"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
    `);

    // Change pharmacies.organization_id FK to ON DELETE CASCADE
    await queryRunner.query(`
      ALTER TABLE "pharmacies"
      DROP CONSTRAINT IF EXISTS "FK_pharmacies_organization";
    `);
    await queryRunner.query(`
      ALTER TABLE "pharmacies"
      ADD CONSTRAINT "FK_pharmacies_organization"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert users.organization_id FK to ON DELETE SET NULL
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT IF EXISTS "FK_users_organization";
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_organization"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
    `);

    // Revert pharmacies.organization_id FK to ON DELETE SET NULL
    await queryRunner.query(`
      ALTER TABLE "pharmacies"
      DROP CONSTRAINT IF EXISTS "FK_pharmacies_organization";
    `);
    await queryRunner.query(`
      ALTER TABLE "pharmacies"
      ADD CONSTRAINT "FK_pharmacies_organization"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
    `);
  }
}



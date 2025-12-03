import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExternalIdToInventory1700000000009 implements MigrationInterface {
  name = 'AddExternalIdToInventory1700000000009'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "external_id" character varying(120)`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_external_idx"
      ON "inventory_items" ("pharmacyId", "external_id")
      WHERE "external_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "inventory_items_external_idx"`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "external_id"`);
  }
}



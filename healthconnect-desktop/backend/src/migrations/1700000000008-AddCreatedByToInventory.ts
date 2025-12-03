import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreatedByToInventory1700000000008 implements MigrationInterface {
  name = 'AddCreatedByToInventory1700000000008'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inventory_items"
      ADD COLUMN IF NOT EXISTS "created_by_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_items"
      ADD CONSTRAINT "FK_inventory_created_by" FOREIGN KEY ("created_by_id")
      REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inventory_items" DROP CONSTRAINT IF EXISTS "FK_inventory_created_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "created_by_id"
    `);
  }
}



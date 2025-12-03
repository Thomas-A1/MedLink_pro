import { MigrationInterface, QueryRunner } from "typeorm";

export class AddServiceToSaleItems1700000000006 implements MigrationInterface {
  name = 'AddServiceToSaleItems1700000000006'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make inventory_item_id nullable to allow service-only sale items
    await queryRunner.query(`
      ALTER TABLE "sale_items"
      ALTER COLUMN "inventory_item_id" DROP NOT NULL
    `);

    // Add service_id referencing pharmacy_services
    await queryRunner.query(`
      ALTER TABLE "sale_items"
      ADD COLUMN IF NOT EXISTS "service_id" uuid NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sale_items"
      ADD CONSTRAINT "FK_sale_items_service_id"
      FOREIGN KEY ("service_id") REFERENCES "pharmacy_services"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sale_items"
      DROP CONSTRAINT IF EXISTS "FK_sale_items_service_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "sale_items"
      DROP COLUMN IF EXISTS "service_id"
    `);
    // Revert inventory_item_id to NOT NULL (assumes data cleanup performed)
    await queryRunner.query(`
      ALTER TABLE "sale_items"
      ALTER COLUMN "inventory_item_id" SET NOT NULL
    `);
  }
}



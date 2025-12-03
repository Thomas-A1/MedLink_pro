import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInventoryBatches1700000000012 implements MigrationInterface {
  name = 'CreateInventoryBatches1700000000012'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "lotNumber" character varying(64) NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "expiryDate" date,
        "inventory_item_id" uuid NOT NULL,
        CONSTRAINT "PK_inventory_batches_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_batches"
      ADD CONSTRAINT "FK_inventory_batches_item" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inventory_batches" DROP CONSTRAINT IF EXISTS "FK_inventory_batches_item"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_batches"`);
  }
}



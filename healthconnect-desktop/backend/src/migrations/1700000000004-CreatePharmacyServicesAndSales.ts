import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePharmacyServicesAndSales1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "service_type_enum" AS ENUM (
        'lab_test',
        'blood_transfusion',
        'blood_test',
        'x_ray',
        'ultrasound',
        'ecg',
        'consultation',
        'vaccination',
        'pharmacy',
        'emergency',
        'maternity',
        'pediatrics',
        'surgery',
        'dental',
        'physiotherapy',
        'other'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pharmacy_services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "pharmacy_id" uuid NOT NULL,
        "name" character varying(64) NOT NULL,
        "type" "service_type_enum" NOT NULL,
        "description" text,
        "price" decimal(10,2),
        "currency" character varying(10),
        "isActive" boolean NOT NULL DEFAULT true,
        "metadata" jsonb,
        CONSTRAINT "PK_pharmacy_services_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pharmacy_services_pharmacy" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sales" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "pharmacy_id" uuid NOT NULL,
        "sold_by_id" uuid,
        "customerName" character varying(160),
        "customerPhone" character varying(20),
        "totalAmount" decimal(10,2) NOT NULL DEFAULT 0,
        "currency" character varying(10) NOT NULL DEFAULT 'GHS',
        "paymentMethod" character varying(32) NOT NULL DEFAULT 'cash',
        "notes" text,
        CONSTRAINT "PK_sales_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sales_pharmacy" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sales_sold_by" FOREIGN KEY ("sold_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sale_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "sale_id" uuid NOT NULL,
        "inventory_item_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unitPrice" decimal(10,2) NOT NULL,
        "totalPrice" decimal(10,2) NOT NULL,
        CONSTRAINT "PK_sale_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sale_items_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sale_items_inventory" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_pharmacy" ON "sales"("pharmacy_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_sold_by" ON "sales"("sold_by_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_created_at" ON "sales"("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pharmacy_services"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "service_type_enum"`);
  }
}


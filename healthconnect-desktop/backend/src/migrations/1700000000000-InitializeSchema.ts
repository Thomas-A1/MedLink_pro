import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitializeSchema1700000000000 implements MigrationInterface {
  name = 'InitializeSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    await queryRunner.query(
      `CREATE TYPE "user_role_enum" AS ENUM ('pharmacist','clerk','hospital_admin','support','super_admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "organization_type_enum" AS ENUM ('pharmacy','hospital')`,
    );
    await queryRunner.query(
      `CREATE TYPE "stock_movements_movement_type_enum" AS ENUM ('restock','sale','return','adjustment','expired','damaged','transfer_out','transfer_in')`,
    );
    await queryRunner.query(`CREATE TYPE "sync_events_status_enum" AS ENUM ('pending','synced','failed')`);
    await queryRunner.query(`CREATE TYPE "queue_entries_status_enum" AS ENUM ('pending','active','completed','cancelled','skipped')`);

    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(160) NOT NULL,
        "slug" character varying(160) NOT NULL,
        "type" "organization_type_enum" NOT NULL DEFAULT 'pharmacy',
        "contact_email" character varying(160),
        "contact_phone" character varying(32),
        "timezone" character varying(64),
        "brand_color" character varying(7),
        "settings" jsonb,
        CONSTRAINT "PK_organizations_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organizations_name" UNIQUE ("name"),
        CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "email" character varying(80) NOT NULL,
        "phone_number" character varying(20) NOT NULL,
        "password_hash" character varying(120) NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'pharmacist',
        "isActive" boolean NOT NULL DEFAULT true,
        "firstName" character varying(120),
        "lastName" character varying(120),
        "languagePreference" character varying(16),
        "organization_id" uuid,
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_phone" UNIQUE ("phone_number"),
        CONSTRAINT "FK_users_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pharmacies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(160) NOT NULL,
        "address" text NOT NULL,
        "region" character varying(64) NOT NULL,
        "district" character varying(64) NOT NULL,
        "contactPhone" character varying(20) NOT NULL,
        "contactEmail" character varying(120),
        "location" geography(Point,4326),
        "isVerified" boolean NOT NULL DEFAULT false,
        "isPartner" boolean NOT NULL DEFAULT false,
        "organization_id" uuid,
        CONSTRAINT "PK_pharmacies_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pharmacies_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pharmacy_staff" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "role" "user_role_enum" NOT NULL DEFAULT 'clerk',
        "isPrimaryLocation" boolean NOT NULL DEFAULT true,
        "pharmacyId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        CONSTRAINT "PK_pharmacy_staff_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pharmacy_user" UNIQUE ("pharmacyId", "userId"),
        CONSTRAINT "FK_pharmacy_staff_pharmacy" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pharmacy_staff_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "inventory_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(160) NOT NULL,
        "genericName" character varying(160),
        "category" character varying(120) NOT NULL,
        "form" character varying(64) NOT NULL,
        "strength" character varying(64) NOT NULL,
        "manufacturer" character varying(160),
        "batchNumber" character varying(64),
        "expiryDate" date,
        "quantityInStock" integer NOT NULL DEFAULT 0,
        "reorderLevel" integer NOT NULL DEFAULT 0,
        "unitPrice" numeric(10,2) NOT NULL DEFAULT 0,
        "sellingPrice" numeric(10,2) NOT NULL DEFAULT 0,
        "barcode" character varying(64),
        "requiresPrescription" boolean NOT NULL DEFAULT false,
        "isAvailable" boolean NOT NULL DEFAULT true,
        "pharmacyId" uuid NOT NULL,
        CONSTRAINT "PK_inventory_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inventory_items_pharmacy" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_inventory_items_name" ON "inventory_items" ("name")
    `);

    await queryRunner.query(`
      CREATE TABLE "stock_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "movementType" "stock_movements_movement_type_enum" NOT NULL,
        "quantity" integer NOT NULL,
        "balanceAfter" integer NOT NULL,
        "referenceId" uuid,
        "notes" text,
        "inventoryItemId" uuid NOT NULL,
        "createdById" uuid,
        CONSTRAINT "PK_stock_movements_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stock_movements_item" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_stock_movements_user" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "prescriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "verificationCode" character varying(32) NOT NULL,
        "sentToPharmacy" boolean NOT NULL DEFAULT false,
        "fulfilledAt" TIMESTAMP,
        "patientId" uuid NOT NULL,
        "doctorId" uuid NOT NULL,
        "assignedPharmacyId" uuid,
        CONSTRAINT "PK_prescriptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_prescriptions_code" UNIQUE ("verificationCode"),
        CONSTRAINT "FK_prescriptions_patient" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_prescriptions_doctor" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_prescriptions_pharmacy" FOREIGN KEY ("assignedPharmacyId") REFERENCES "pharmacies"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "prescription_medications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "drugName" character varying(160) NOT NULL,
        "strength" character varying(64) NOT NULL,
        "dosage" character varying(64) NOT NULL,
        "frequency" character varying(64) NOT NULL,
        "duration" character varying(64) NOT NULL,
        "instructions" text,
        "prescriptionId" uuid NOT NULL,
        CONSTRAINT "PK_prescription_medications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prescription_medications_prescription" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sync_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "clientVersion" character varying(16) NOT NULL,
        "lastMutationAt" TIMESTAMP,
        "hasConflicts" boolean NOT NULL DEFAULT false,
        "userId" uuid NOT NULL,
        "pharmacyId" uuid NOT NULL,
        CONSTRAINT "PK_sync_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sync_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sync_sessions_pharmacy" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sync_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "source" character varying(32) NOT NULL,
        "entityType" character varying(64) NOT NULL,
        "entityId" uuid,
        "payloadHash" character varying(64) NOT NULL,
        "status" "sync_events_status_enum" NOT NULL DEFAULT 'pending',
        "payload" text NOT NULL,
        "failureReason" text,
        "syncedAt" TIMESTAMP,
        "pharmacyId" uuid NOT NULL,
        "userId" uuid,
        CONSTRAINT "PK_sync_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sync_events_pharmacy" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sync_events_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sync_events_status" ON "sync_events" ("status")
    `);

    await queryRunner.query(`
      CREATE TABLE "queue_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "status" "queue_entries_status_enum" NOT NULL DEFAULT 'pending',
        "priority" integer NOT NULL DEFAULT 0,
        "acknowledgedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "pharmacyId" uuid NOT NULL,
        "patientId" uuid NOT NULL,
        CONSTRAINT "PK_queue_entries_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_queue_entries_pharmacy" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_queue_entries_patient" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_queue_entries_status" ON "queue_entries" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_queue_entries_status"`);
    await queryRunner.query(`DROP TABLE "queue_entries"`);

    await queryRunner.query(`DROP INDEX "IDX_sync_events_status"`);
    await queryRunner.query(`DROP TABLE "sync_events"`);
    await queryRunner.query(`DROP TABLE "sync_sessions"`);

    await queryRunner.query(`DROP TABLE "prescription_medications"`);
    await queryRunner.query(`DROP TABLE "prescriptions"`);

    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(`DROP INDEX "IDX_inventory_items_name"`);
    await queryRunner.query(`DROP TABLE "inventory_items"`);

    await queryRunner.query(`DROP TABLE "pharmacy_staff"`);
    await queryRunner.query(`DROP TABLE "pharmacies"`);

    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "organizations"`);

    await queryRunner.query(`DROP TYPE "queue_entries_status_enum"`);
    await queryRunner.query(`DROP TYPE "sync_events_status_enum"`);
    await queryRunner.query(`DROP TYPE "stock_movements_movement_type_enum"`);
    await queryRunner.query(`DROP TYPE "organization_type_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}

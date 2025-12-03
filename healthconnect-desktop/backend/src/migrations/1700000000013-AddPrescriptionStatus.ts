import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPrescriptionStatus1700000000013 implements MigrationInterface {
  name = 'AddPrescriptionStatus1700000000013'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'prescriptions_status_enum'
        ) THEN
          CREATE TYPE prescriptions_status_enum AS ENUM ('received','preparing','ready','completed','cancelled');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE "prescriptions"
      ADD COLUMN IF NOT EXISTS "status" prescriptions_status_enum DEFAULT 'received',
      ADD COLUMN IF NOT EXISTS "readyAt" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "pickedUpAt" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "statusNotes" TEXT,
      ADD COLUMN IF NOT EXISTS "substitutions" JSONB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "prescriptions"
      DROP COLUMN IF EXISTS "substitutions",
      DROP COLUMN IF EXISTS "statusNotes",
      DROP COLUMN IF EXISTS "pickedUpAt",
      DROP COLUMN IF EXISTS "readyAt",
      DROP COLUMN IF EXISTS "status"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS prescriptions_status_enum`);
  }
}



import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSaleToActivityEnum1700000000007 implements MigrationInterface {
  name = 'AddSaleToActivityEnum1700000000007'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Postgres enum alteration: add value 'sale' if not present
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_logs_resource_type_enum'
          AND e.enumlabel = 'sale'
        ) THEN
          ALTER TYPE "activity_logs_resource_type_enum" ADD VALUE 'sale';
        END IF;
      END $$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No safe down for enum value removal in Postgres; leave as-is
  }
}



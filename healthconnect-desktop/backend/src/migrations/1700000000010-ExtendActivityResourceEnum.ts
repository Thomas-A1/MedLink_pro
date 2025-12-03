import { MigrationInterface, QueryRunner } from "typeorm";

export class ExtendActivityResourceEnum1700000000010 implements MigrationInterface {
  name = 'ExtendActivityResourceEnum1700000000010'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_logs_resource_type_enum'
          AND e.enumlabel = 'report'
        ) THEN
          ALTER TYPE "activity_logs_resource_type_enum" ADD VALUE 'report';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_logs_resource_type_enum'
          AND e.enumlabel = 'backup'
        ) THEN
          ALTER TYPE "activity_logs_resource_type_enum" ADD VALUE 'backup';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_logs_resource_type_enum'
          AND e.enumlabel = 'integration'
        ) THEN
          ALTER TYPE "activity_logs_resource_type_enum" ADD VALUE 'integration';
        END IF;
      END $$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Enum value removal not supported safely; no-op
  }
}



import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixUrgencyEnum1700000000101 implements MigrationInterface {
  name = 'FixUrgencyEnum1700000000101';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old enum type if it exists (with CASCADE to handle dependencies)
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mobile_urgency_level_enum_old') THEN
          -- First, alter columns to use text temporarily
          ALTER TABLE mobile_queue_entries ALTER COLUMN "urgencyLevel" TYPE varchar USING "urgencyLevel"::text;
          ALTER TABLE mobile_consultations ALTER COLUMN "urgencyLevel" TYPE varchar USING "urgencyLevel"::text;
          
          -- Drop the old enum
          DROP TYPE mobile_urgency_level_enum_old CASCADE;
          
          -- Restore columns to use the correct enum
          ALTER TABLE mobile_queue_entries ALTER COLUMN "urgencyLevel" TYPE mobile_urgency_level_enum USING "urgencyLevel"::mobile_urgency_level_enum;
          ALTER TABLE mobile_consultations ALTER COLUMN "urgencyLevel" TYPE mobile_urgency_level_enum USING "urgencyLevel"::mobile_urgency_level_enum;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: This migration only cleans up orphaned types
  }
}


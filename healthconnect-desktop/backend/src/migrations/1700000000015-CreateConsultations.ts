import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConsultations1700000000015 implements MigrationInterface {
  name = 'CreateConsultations1700000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "consultation_status_enum" AS ENUM (
        'requested', 'queued', 'in_progress', 'completed', 'cancelled', 'no_show'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "consultation_type_enum" AS ENUM ('voice', 'video');
    `);

    await queryRunner.query(`
      CREATE TYPE "urgency_level_enum" AS ENUM ('emergency', 'urgent', 'routine');
    `);

    await queryRunner.query(`
      CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'paid', 'refunded', 'failed');
    `);

    await queryRunner.query(`
      CREATE TABLE "consultations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "status" "consultation_status_enum" NOT NULL DEFAULT 'requested',
        "urgency_level" "urgency_level_enum" NOT NULL DEFAULT 'routine',
        "chief_complaint" text,
        "audio_complaint_url" text,
        "consultation_type" "consultation_type_enum" NOT NULL DEFAULT 'video',
        "payment_status" "payment_status_enum" NOT NULL DEFAULT 'pending',
        "payment_amount" numeric(10,2),
        "payment_transaction_id" varchar(255),
        "queue_position" integer,
        "queue_joined_at" TIMESTAMP,
        "estimated_wait_time" integer,
        "call_started_at" TIMESTAMP,
        "call_ended_at" TIMESTAMP,
        "call_duration" integer,
        "call_recording_url" text,
        "transcript" text,
        "doctor_notes" text,
        "diagnosis" text,
        "treatment_plan" text,
        "follow_up_required" boolean NOT NULL DEFAULT false,
        "follow_up_date" TIMESTAMP,
        "patient_id" uuid NOT NULL,
        "doctor_id" uuid NOT NULL,
        CONSTRAINT "PK_consultations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_consultations_patient" FOREIGN KEY ("patient_id") 
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_consultations_doctor" FOREIGN KEY ("doctor_id") 
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_consultations_patient" ON "consultations"("patient_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_consultations_doctor" ON "consultations"("doctor_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_consultations_status" ON "consultations"("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_consultations_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_consultations_doctor";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_consultations_patient";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "consultations";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "urgency_level_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "consultation_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "consultation_status_enum";`);
  }
}


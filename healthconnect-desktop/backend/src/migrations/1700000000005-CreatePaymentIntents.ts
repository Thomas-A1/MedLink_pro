import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentIntents1700000000005 implements MigrationInterface {
  name = 'CreatePaymentIntents1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_intents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "reference" character varying(64) NOT NULL,
        "provider" character varying(64) NOT NULL,
        "purpose" character varying(16) NOT NULL,
        "pharmacyId" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "currency" character varying(8) NOT NULL DEFAULT 'GHS',
        "status" character varying(24) NOT NULL DEFAULT 'initialized',
        "payload" jsonb NOT NULL,
        "customerEmail" character varying(160),
        "customerPhone" character varying(32),
        CONSTRAINT "PK_payment_intents_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_payment_intents_reference" ON "payment_intents" ("reference");`);
    await queryRunner.query(`CREATE INDEX "IDX_payment_intents_pharmacy" ON "payment_intents" ("pharmacyId");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_intents_pharmacy";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_intents_reference";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_intents";`);
  }
}



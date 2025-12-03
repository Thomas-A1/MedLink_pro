import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBackupsTable1700000000011 implements MigrationInterface {
  name = 'CreateBackupsTable1700000000011'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "backup_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "type" character varying NOT NULL DEFAULT 'manual',
        "status" character varying NOT NULL DEFAULT 'completed',
        "size" bigint NOT NULL DEFAULT 0,
        "storage_path" character varying(255) NOT NULL,
        "checksum" character varying(64),
        "metadata" jsonb,
        "pharmacy_id" uuid NOT NULL,
        "created_by_id" uuid,
        CONSTRAINT "PK_backup_records_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "backup_records"
      ADD CONSTRAINT "FK_backup_pharmacy" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "backup_records"
      ADD CONSTRAINT "FK_backup_user" FOREIGN KEY ("created_by_id") REFERENCES "users"("id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "backup_records" DROP CONSTRAINT IF EXISTS "FK_backup_user"`);
    await queryRunner.query(`ALTER TABLE "backup_records" DROP CONSTRAINT IF EXISTS "FK_backup_pharmacy"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "backup_records"`);
  }
}



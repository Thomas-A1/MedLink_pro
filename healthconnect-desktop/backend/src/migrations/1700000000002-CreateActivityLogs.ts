import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActivityLogs1700000000002 implements MigrationInterface {
  name = 'CreateActivityLogs1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "activity_logs_resource_type_enum" AS ENUM (
        'inventory_item',
        'stock_movement',
        'prescription',
        'queue_entry',
        'organization',
        'pharmacy',
        'auth'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "activity_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "resourceType" "activity_logs_resource_type_enum" NOT NULL,
        "resourceId" character varying,
        "action" character varying(160) NOT NULL,
        "metadata" jsonb,
        "actorId" uuid,
        "organizationId" uuid,
        CONSTRAINT "PK_activity_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_activity_logs_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_activity_logs_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_resourceType" ON "activity_logs" ("resourceType")`);
    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_resourceId" ON "activity_logs" ("resourceId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_activity_logs_resourceId"`);
    await queryRunner.query(`DROP INDEX "IDX_activity_logs_resourceType"`);
    await queryRunner.query(`DROP TABLE "activity_logs"`);
    await queryRunner.query(`DROP TYPE "activity_logs_resource_type_enum"`);
  }
}


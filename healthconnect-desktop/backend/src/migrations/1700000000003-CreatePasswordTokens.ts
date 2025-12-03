import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordTokens1700000000003 implements MigrationInterface {
  name = 'CreatePasswordTokens1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "password_tokens_type_enum" AS ENUM ('reset', 'invite')`);
    await queryRunner.query(`
      CREATE TABLE "password_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "type" "password_tokens_type_enum" NOT NULL,
        "tokenHash" character varying(64) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "usedAt" TIMESTAMP,
        "userId" uuid NOT NULL,
        CONSTRAINT "UQ_password_tokens_tokenHash" UNIQUE ("tokenHash"),
        CONSTRAINT "PK_password_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_password_tokens_type" ON "password_tokens" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_password_tokens_user" ON "password_tokens" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_password_tokens_user"`);
    await queryRunner.query(`DROP INDEX "IDX_password_tokens_type"`);
    await queryRunner.query(`DROP TABLE "password_tokens"`);
    await queryRunner.query(`DROP TYPE "password_tokens_type_enum"`);
  }
}


import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandLogoUrlLength1700000000006 implements MigrationInterface {
    name = 'ExpandLogoUrlLength1700000000006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "logo_url" TYPE TEXT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "logo_url" TYPE varchar(500)`);
    }
}



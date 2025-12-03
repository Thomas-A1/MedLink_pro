import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPharmacyLocationColumns1700000000001 implements MigrationInterface {
  name = 'AddPharmacyLocationColumns1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pharmacies" ADD "latitude" double precision`);
    await queryRunner.query(`ALTER TABLE "pharmacies" ADD "longitude" double precision`);
    await queryRunner.query(`ALTER TABLE "pharmacies" ADD "country" character varying(120)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pharmacies" DROP COLUMN "country"`);
    await queryRunner.query(`ALTER TABLE "pharmacies" DROP COLUMN "longitude"`);
    await queryRunner.query(`ALTER TABLE "pharmacies" DROP COLUMN "latitude"`);
  }
}


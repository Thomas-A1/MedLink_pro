import { MigrationInterface, QueryRunner } from 'typeorm';

export class MobileInit1700000000100 implements MigrationInterface {
  name = 'MobileInit1700000000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TYPE "mobile_user_role_enum" AS ENUM (
        'patient',
        'doctor',
        'hospital_staff',
        'pharmacy_staff',
        'lab_staff',
        'admin',
        'super_admin'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "mobile_org_type_enum" AS ENUM (
        'hospital',
        'pharmacy',
        'clinic',
        'lab',
        'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "mobile_consultation_status_enum" AS ENUM (
        'requested',
        'queued',
        'in_progress',
        'completed',
        'cancelled',
        'no_show'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "mobile_consultation_type_enum" AS ENUM ('voice','video')
    `);

    await queryRunner.query(`
      CREATE TYPE "mobile_consultation_payment_status_enum" AS ENUM ('pending','paid','refunded','failed')
    `);

    await queryRunner.query(`
      CREATE TYPE "mobile_urgency_level_enum" AS ENUM ('emergency','urgent','routine')
    `);

    await queryRunner.query(`
      CREATE TYPE "mobile_queue_status_enum" AS ENUM ('waiting','ready','calling','timed_out','removed')
    `);

    await queryRunner.query(`
      CREATE TYPE "mobile_payment_method_enum" AS ENUM ('mobile_money','card','wallet')
    `);

    await queryRunner.query(`
      CREATE TYPE "mobile_payment_status_enum" AS ENUM ('pending','success','failed','refunded')
    `);

    await queryRunner.query(`
      CREATE TABLE "mobile_organization_links" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(160) NOT NULL,
        "type" "mobile_org_type_enum" NOT NULL DEFAULT 'other',
        "external_desktop_org_id" character varying,
        "address" character varying(160),
        "region" character varying(80),
        "district" character varying(80),
        CONSTRAINT "PK_mobile_org_links_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mobile_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "email" character varying(160),
        "phone_number" character varying(32) NOT NULL,
        "password_hash" character varying(120) NOT NULL,
        "role" "mobile_user_role_enum" NOT NULL DEFAULT 'patient',
        "isActive" boolean NOT NULL DEFAULT true,
        "firstName" character varying(80),
        "lastName" character varying(80),
        "profilePhotoUrl" character varying,
        "languagePreference" character varying(8),
        "external_desktop_user_id" character varying,
        "organization_id" uuid,
        CONSTRAINT "PK_mobile_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_mobile_users_phone" UNIQUE ("phone_number"),
        CONSTRAINT "UQ_mobile_users_email" UNIQUE ("email"),
        CONSTRAINT "FK_mobile_users_org" FOREIGN KEY ("organization_id") REFERENCES "mobile_organization_links"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mobile_patient_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "date_of_birth" date,
        "gender" character varying(32),
        "region" character varying(120),
        "district" character varying(120),
        "user_id" uuid,
        CONSTRAINT "PK_mobile_patient_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_mobile_patient_profile_user" UNIQUE ("user_id"),
        CONSTRAINT "FK_mobile_patient_profile_user" FOREIGN KEY ("user_id") REFERENCES "mobile_users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mobile_pharmacies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(160) NOT NULL,
        "address" character varying(200) NOT NULL,
        "phone" character varying(32),
        "latitude" double precision NOT NULL,
        "longitude" double precision NOT NULL,
        "rating" double precision,
        "isPartner" boolean NOT NULL DEFAULT false,
        "isOpen" boolean NOT NULL DEFAULT true,
        "openingHours" character varying(120),
        "imageUrl" character varying,
        "services" text[],
        "metadata" jsonb,
        CONSTRAINT "PK_mobile_pharmacies_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mobile_hospitals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(160) NOT NULL,
        "address" character varying(200) NOT NULL,
        "phone" character varying(32),
        "latitude" double precision NOT NULL,
        "longitude" double precision NOT NULL,
        "hasEmergency" boolean NOT NULL DEFAULT false,
        "hospitalType" character varying(80),
        "rating" double precision,
        "isOpen" boolean NOT NULL DEFAULT true,
        "openingHours" character varying(120),
        "imageUrl" character varying,
        "services" text[],
        "metadata" jsonb,
        CONSTRAINT "PK_mobile_hospitals_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mobile_doctors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(160) NOT NULL,
        "specialty" character varying(120) NOT NULL,
        "facility" character varying(160) NOT NULL,
        "rating" double precision NOT NULL DEFAULT '0',
        "reviewCount" integer NOT NULL DEFAULT '0',
        "consultationFee" double precision NOT NULL DEFAULT '0',
        "waitTimeMinutes" integer NOT NULL DEFAULT '5',
        "isOnline" boolean NOT NULL DEFAULT true,
        "languages" text[],
        "experienceYears" integer NOT NULL DEFAULT '1',
        "imageUrl" character varying,
        "bio" text,
        CONSTRAINT "PK_mobile_doctors_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mobile_drugs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(160) NOT NULL,
        "genericName" character varying(160),
        "category" character varying(80),
        "form" character varying(40),
        "strength" character varying(40),
        CONSTRAINT "PK_mobile_drugs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mobile_pharmacy_inventory" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "quantity" integer NOT NULL,
        "price" double precision,
        "dosage" character varying(40),
        "pharmacy_id" uuid,
        "drug_id" uuid,
        CONSTRAINT "PK_mobile_pharmacy_inventory_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inventory_pharmacy" FOREIGN KEY ("pharmacy_id") REFERENCES "mobile_pharmacies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inventory_drug" FOREIGN KEY ("drug_id") REFERENCES "mobile_drugs"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mobile_consultations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "status" "mobile_consultation_status_enum" NOT NULL DEFAULT 'requested',
        "urgencyLevel" "mobile_urgency_level_enum" NOT NULL DEFAULT 'routine',
        "consultationType" "mobile_consultation_type_enum" NOT NULL DEFAULT 'video',
        "paymentStatus" "mobile_consultation_payment_status_enum" NOT NULL DEFAULT 'pending',
        "chiefComplaint" text,
        "audioComplaintUrl" character varying,
        "complaintMetadata" jsonb,
        "paymentAmount" double precision,
        "paymentTransactionId" character varying,
        "queuePosition" integer,
        "queueJoinedAt" TIMESTAMP,
        "estimatedWaitTime" integer,
        "callStartedAt" TIMESTAMP,
        "callEndedAt" TIMESTAMP,
        "callDuration" integer,
        "callRecordingUrl" character varying,
        "transcript" text,
        "doctorNotes" text,
        "diagnosis" text,
        "treatmentPlan" text,
        "followUpRequired" boolean NOT NULL DEFAULT false,
        "followUpDate" TIMESTAMP,
        "patient_id" uuid,
        "doctor_id" uuid,
        CONSTRAINT "PK_mobile_consultations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mobile_consultations_patient" FOREIGN KEY ("patient_id") REFERENCES "mobile_users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_mobile_consultations_doctor" FOREIGN KEY ("doctor_id") REFERENCES "mobile_doctors"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mobile_queue_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "position" integer NOT NULL,
        "joinedAt" TIMESTAMP NOT NULL,
        "estimatedWaitTime" integer NOT NULL,
        "readyAt" TIMESTAMP,
        "timeoutAt" TIMESTAMP,
        "status" "mobile_queue_status_enum" NOT NULL DEFAULT 'waiting',
        "urgencyLevel" "mobile_urgency_level_enum" NOT NULL DEFAULT 'routine',
        "consultation_id" uuid,
        CONSTRAINT "PK_mobile_queue_entries_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mobile_queue_consultation" FOREIGN KEY ("consultation_id") REFERENCES "mobile_consultations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mobile_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "amount" double precision NOT NULL,
        "method" "mobile_payment_method_enum" NOT NULL,
        "status" "mobile_payment_status_enum" NOT NULL DEFAULT 'pending',
        "reference" character varying,
        "metadata" text,
        "consultation_id" uuid,
        CONSTRAINT "PK_mobile_payments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mobile_payments_consultation" FOREIGN KEY ("consultation_id") REFERENCES "mobile_consultations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_mobile_users_phone" ON "mobile_users" ("phone_number")`);
    await queryRunner.query(`CREATE INDEX "IDX_mobile_users_role" ON "mobile_users" ("role")`);
    await queryRunner.query(`CREATE INDEX "IDX_mobile_org_links_type" ON "mobile_organization_links" ("type")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "mobile_payments"`);
    await queryRunner.query(`DROP TABLE "mobile_queue_entries"`);
    await queryRunner.query(`DROP TABLE "mobile_consultations"`);
    await queryRunner.query(`DROP TABLE "mobile_pharmacy_inventory"`);
    await queryRunner.query(`DROP TABLE "mobile_drugs"`);
    await queryRunner.query(`DROP TABLE "mobile_doctors"`);
    await queryRunner.query(`DROP TABLE "mobile_hospitals"`);
    await queryRunner.query(`DROP TABLE "mobile_pharmacies"`);
    await queryRunner.query(`DROP INDEX "IDX_mobile_org_links_type"`);
    await queryRunner.query(`DROP INDEX "IDX_mobile_users_role"`);
    await queryRunner.query(`DROP INDEX "IDX_mobile_users_phone"`);
    await queryRunner.query(`DROP TABLE "mobile_patient_profiles"`);
    await queryRunner.query(`DROP TABLE "mobile_users"`);
    await queryRunner.query(`DROP TABLE "mobile_organization_links"`);
    await queryRunner.query(`DROP TYPE "mobile_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "mobile_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "mobile_queue_status_enum"`);
    await queryRunner.query(`DROP TYPE "mobile_consultation_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "mobile_consultation_type_enum"`);
    await queryRunner.query(`DROP TYPE "mobile_consultation_status_enum"`);
    await queryRunner.query(`DROP TYPE "mobile_urgency_level_enum"`);
    await queryRunner.query(`DROP TYPE "mobile_org_type_enum"`);
    await queryRunner.query(`DROP TYPE "mobile_user_role_enum"`);
  }
}


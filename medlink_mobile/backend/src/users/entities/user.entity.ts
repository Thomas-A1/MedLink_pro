import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { OrganizationLink } from './organization-link.entity';
import { PatientProfile } from './patient-profile.entity';

@Entity({ name: 'mobile_users' })
export class User extends BaseEntity {
  @Column({ type: 'varchar', unique: true, nullable: true, length: 160 })
  email?: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', name: 'phone_number', length: 32 })
  phoneNumber: string;

  @Column({ type: 'varchar', name: 'password_hash', length: 120 })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PATIENT })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true, length: 80 })
  firstName?: string;

  @Column({ type: 'varchar', nullable: true, length: 80 })
  lastName?: string;

  @Column({ type: 'varchar', nullable: true })
  profilePhotoUrl?: string;

  @Column({ type: 'varchar', nullable: true, length: 8 })
  languagePreference?: string;

  @Column({ type: 'varchar', name: 'external_desktop_user_id', nullable: true })
  externalDesktopUserId?: string;

  @Column({ type: 'varchar', name: 'otp_code', nullable: true, length: 6 })
  otpCode?: string | null;

  @Column({ type: 'timestamp', name: 'otp_expires_at', nullable: true })
  otpExpiresAt?: Date | null;

  @Column({ type: 'boolean', name: 'phone_verified', default: false })
  phoneVerified: boolean;

  @Column({ type: 'boolean', name: 'is_online', default: false })
  isOnline: boolean;

  @Column({ type: 'timestamp', name: 'last_seen_at', nullable: true })
  lastSeenAt?: Date;

  @ManyToOne(() => OrganizationLink, (organization) => organization.users, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationLink | null;

  @OneToOne(() => PatientProfile, (profile) => profile.user)
  patientProfile?: PatientProfile;
}


import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserRole } from '../enums/role.enum';
import { PharmacyStaff } from '../../pharmacy/entities/pharmacy-staff.entity';
import { SyncSession } from '../../sync/entities/sync-session.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 80 })
  email: string;

  @Index({ unique: true })
  @Column({ name: 'phone_number', length: 20 })
  phoneNumber: string;

  @Column({ name: 'password_hash', length: 120 })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PHARMACIST })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  languagePreference?: string;

  @ManyToOne(() => Organization, (organization) => organization.users, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @OneToMany(() => PharmacyStaff, (staff) => staff.user)
  pharmacyStaff?: PharmacyStaff[];

  @OneToMany(() => SyncSession, (session) => session.user)
  syncSessions?: SyncSession[];
}

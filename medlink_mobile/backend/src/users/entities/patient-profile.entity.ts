import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from './user.entity';

@Entity({ name: 'mobile_patient_profiles' })
export class PatientProfile extends BaseEntity {
  @OneToOne(() => User, (user) => user.patientProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth?: Date;

  @Column({ nullable: true, length: 32 })
  gender?: string;

  @Column({ nullable: true, length: 120 })
  region?: string;

  @Column({ nullable: true, length: 120 })
  district?: string;
}


import { Column, Entity, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Consultation } from '../../consultations/entities/consultation.entity';

@Entity({ name: 'reviews' })
@Index(['doctor', 'patient'])
@Index(['consultation'])
export class Review extends BaseEntity {
  @ManyToOne(() => Doctor, { eager: true })
  doctor: Doctor;

  @ManyToOne(() => User, { eager: true })
  patient: User;

  @ManyToOne(() => Consultation, { nullable: true })
  consultation?: Consultation;

  @Column({ type: 'integer' })
  rating: number; // 1-5 stars

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean; // True if review is from a completed consultation

  @Column({ type: 'boolean', default: true })
  isVisible: boolean; // For moderation
}


import { Column, Entity, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Consultation } from '../../consultations/entities/consultation.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

@Entity({ name: 'messages' })
@Index(['sender', 'recipient'])
@Index(['consultation'])
@Index(['createdAt'])
export class Message extends BaseEntity {
  @ManyToOne(() => User, { nullable: true })
  sender?: User; // Patient sender

  @ManyToOne(() => Doctor, { nullable: true })
  doctorSender?: Doctor; // Doctor sender

  @ManyToOne(() => User, { nullable: true })
  recipient?: User; // Patient recipient

  @ManyToOne(() => Doctor, { nullable: true })
  doctorRecipient?: Doctor; // Doctor recipient

  @ManyToOne(() => Consultation, { nullable: true })
  consultation?: Consultation;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  attachmentUrl?: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;
}


import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../common/entities/user.entity';

export enum PasswordTokenType {
  RESET = 'reset',
  INVITE = 'invite',
}

@Entity({ name: 'password_tokens' })
export class PasswordToken extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  user: User;

  @Index()
  @Column({ type: 'enum', enum: PasswordTokenType })
  type: PasswordTokenType;

  @Index({ unique: true })
  @Column({ length: 64 })
  tokenHash: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  usedAt?: Date | null;
}


import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Pharmacy } from './pharmacy.entity';
import { User } from '../../common/entities/user.entity';
import { UserRole } from '../../common/enums/role.enum';

@Entity({ name: 'pharmacy_staff' })
@Unique(['pharmacy', 'user'])
export class PharmacyStaff extends BaseEntity {
  @ManyToOne(() => Pharmacy, (pharmacy) => pharmacy.staff)
  pharmacy: Pharmacy;

  @ManyToOne(() => User, (user) => user.pharmacyStaff)
  user: User;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLERK })
  role: UserRole;

  @Column({ default: true })
  isPrimaryLocation: boolean;
}

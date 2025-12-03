import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { OrganizationType } from '../../common/enums/organization-type.enum';
import { User } from './user.entity';

@Entity({ name: 'mobile_organization_links' })
export class OrganizationLink extends BaseEntity {
  @Column({ length: 160 })
  name: string;

  @Column({ type: 'enum', enum: OrganizationType, default: OrganizationType.OTHER })
  type: OrganizationType;

  @Column({ name: 'external_desktop_org_id', nullable: true })
  externalDesktopOrgId?: string;

  @Column({ nullable: true, length: 160 })
  address?: string;

  @Column({ nullable: true, length: 80 })
  region?: string;

  @Column({ nullable: true, length: 80 })
  district?: string;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];
}


import { UserRole } from '../../common/enums/user-role.enum';

export interface TokenPayload {
  sub: string;
  role: UserRole;
  phoneNumber: string;
  organizationId?: string | null;
}


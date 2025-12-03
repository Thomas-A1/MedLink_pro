import { IsEmail, IsEnum, IsPhoneNumber, IsString } from 'class-validator';
import { UserRole } from '../../common/enums/role.enum';

export class InviteStaffDto {
  @IsEmail()
  email: string;

  @IsPhoneNumber('GH')
  phoneNumber: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEnum(UserRole)
  role: UserRole;
}

import { IsNotEmpty, IsString } from 'class-validator';

export class RemoveStaffDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}



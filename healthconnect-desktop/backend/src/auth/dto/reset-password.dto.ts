import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Reset code must be exactly 6 digits' })
  code: string;

  @IsString()
  @MinLength(8)
  password: string;
}


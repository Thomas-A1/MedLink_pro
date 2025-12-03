import { IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  phoneNumber: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number' })
  otpCode: string;
}


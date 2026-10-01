import { IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { OtpTypeDto } from './send-otp.dto';

export class VerifyOtpDto {
  @IsEnum(OtpTypeDto)
  @IsNotEmpty()
  type: OtpTypeDto;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

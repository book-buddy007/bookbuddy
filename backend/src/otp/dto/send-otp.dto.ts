import { IsEnum, IsNotEmpty } from 'class-validator';

export enum OtpTypeDto {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export class SendOtpDto {
  @IsEnum(OtpTypeDto)
  @IsNotEmpty()
  type: OtpTypeDto;
}

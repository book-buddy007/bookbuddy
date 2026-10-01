import { IsNotEmpty, IsString } from 'class-validator';
import {
  IsStrongPassword,
  IsDifferentFromOld,
} from '../validators/password.validator';

/**
 * DTO for changing user password
 * Requires current password verification and ensures new password is different
 */
export class PasswordChangeDto {
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  currentPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @IsStrongPassword()
  @IsDifferentFromOld()
  newPassword: string;

  @IsNotEmpty({ message: 'Password confirmation is required' })
  @IsString()
  confirmPassword: string;
}

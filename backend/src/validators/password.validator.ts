import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator for strong password requirements
 * Requires: uppercase, lowercase, number, special character, min 8 chars
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint
  implements ValidatorConstraintInterface
{
  validate(password: string, _args: ValidationArguments) {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // Minimum 8 characters
    if (password.length < 8) {
      return false;
    }

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // At least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // At least one number
    if (!/\d/.test(password)) {
      return false;
    }

    // At least one special character
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return false;
    }

    return true;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character';
  }
}

/**
 * Decorator for strong password validation
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

/**
 * Custom validator to check if password is different from old password
 */
@ValidatorConstraint({ name: 'isDifferentFromOld', async: false })
export class IsDifferentFromOldConstraint
  implements ValidatorConstraintInterface
{
  validate(newPassword: string, args: ValidationArguments) {
    const object = args.object as any;
    const oldPassword = object.currentPassword;

    if (!oldPassword || !newPassword) {
      return true; // Let other validators handle empty values
    }

    return newPassword !== oldPassword;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'New password must be different from current password';
  }
}

/**
 * Decorator to ensure new password is different from old
 */
export function IsDifferentFromOld(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDifferentFromOldConstraint,
    });
  };
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  // Matches,
} from 'class-validator';
import { UserKind } from 'prisma/generated/enums';

export class RegisterUserDto {
  @ApiProperty({
    description: 'The category of user account being created',
    enum: UserKind,
    example: UserKind.DRIVER,
  })
  @IsNotEmpty()
  @IsEnum(UserKind, { message: 'kind must be a valid UserKind enum value' })
  kind: UserKind;

  @ApiProperty({
    description: 'Full legal name of the user',
    example: 'John Doe',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description:
      'Unique electronic mail address for account verification and login',
    example: 'customer@example.com',
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contact number in E.164 format or standard string',
    example: '+19876543210',
  })
  @IsNotEmpty()
  @IsString()
  // Optional: Add regex for phone validation
  // @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'phone_number must be valid E.164 format' })
  phone_number: string;

  @ApiProperty({
    description: 'Secure account password. Must contain at least 8 characters.',
    example: '12345678',
    minLength: 8,
    format: 'password',
    writeOnly: true, // Ensures password isn't displayed in response schemas
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiPropertyOptional({
    description:
      'The registered business name of the garage. Required if kind is GARAGE.',
    example: 'Elite Auto Services',
  })
  @ValidateIf((o) => o.kind === UserKind.GARAGE)
  @IsNotEmpty({ message: 'garage_name is mandatory when user kind is GARAGE' })
  @IsString()
  garage_name?: string;

  @ApiPropertyOptional({
    description:
      'Vehicle Technical Service (VTS) certification number. Required if kind is GARAGE.',
    example: 'VTS-990821',
  })
  @ValidateIf((o) => o.kind === UserKind.GARAGE)
  @IsNotEmpty({ message: 'vts_number is mandatory when user kind is GARAGE' })
  @IsString()
  vts_number?: string;

  @ApiPropertyOptional({
    description:
      'The name of the lead representative for the business. Required if kind is GARAGE.',
    example: 'Jane Smith',
  })
  @ValidateIf((o) => o.kind === UserKind.GARAGE)
  @IsNotEmpty({
    message: 'primary_contact is mandatory when user kind is GARAGE',
  })
  @IsString()
  primary_contact?: string;

  @ApiPropertyOptional({
    description:
      'Garage postcode. Used to calculate garage latitude/longitude.',
    example: 'SW1A 0AA',
  })
  @ValidateIf((o) => o.kind === UserKind.GARAGE)
  @IsOptional()
  @IsString()
  post_code?: string;

  @ApiPropertyOptional({
    description: 'Garage full address',
    example: '123 Main Street, London',
  })
  @ValidateIf((o) => o.kind === UserKind.GARAGE)
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Garage city',
    example: 'London',
  })
  @ValidateIf((o) => o.kind === UserKind.GARAGE)
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Garage state or county',
    example: 'Greater London',
  })
  @ValidateIf((o) => o.kind === UserKind.GARAGE)
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Garage country',
    example: 'UK',
  })
  @ValidateIf((o) => o.kind === UserKind.GARAGE)
  @IsOptional()
  @IsString()
  country?: string;
}

export class LoginUserDto {
  @ApiProperty({
    description: 'Email address',
    example: 'customer@example.com',
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password',
    example: '12345678',
    minLength: 8,
    format: 'password',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address',
    example: 'customer@example.com',
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email address',
    example: 'customer@example.com',
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Verification token',
    example: '123456',
    format: 'number',
  })
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class ResendVerificationEmailDto {
  @ApiProperty({
    description: 'Email address',
    example: 'customer@example.com',
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email address',
    example: 'customer@example.com',
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Reset password token',
    example: '123456',
    format: 'string',
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password',
    example: '12345678',
    minLength: 8,
    format: 'password',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Old password',
    example: '12345678',
    minLength: 8,
    format: 'password',
  })
  @IsNotEmpty()
  @IsString()
  old_password: string;

  @ApiProperty({
    description: 'New password',
    example: '12345678',
    minLength: 8,
    format: 'password',
  })
  @IsNotEmpty()
  @IsString()
  new_password: string;
}

export class RequestEmailChangeDto {
  @ApiProperty({
    description: 'New email address',
    example: 'customer@example.com',
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class ChangeEmailDto {
  @ApiProperty({
    description: 'New email address',
    example: 'customer@example.com',
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Verification token',
    example: '123456',
    format: 'string',
  })
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class CheckOTPValidationDto {
  @ApiProperty({
    description: 'Email address',
    example: 'customer@example.com',
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'One-time password sent to the email',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  otp: string;
}

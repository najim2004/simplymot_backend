import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { UserKind } from 'prisma/generated/enums';

export class CreateUserDto {
  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+91 9876543210',
  })
  @IsNotEmpty()
  @IsString()
  phone_number: string;

  @ApiProperty({
    description: 'User password',
    example: 'password',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password should be minimum 8' })
  password: string;

  @ApiProperty({
    description: 'User kind',
    example: UserKind.USER,
  })
  @IsNotEmpty()
  @IsEnum(UserKind, { message: 'Invalid user kind' })
  kind: UserKind;
}

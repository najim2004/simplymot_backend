import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsArray,
  IsOptional,
  IsString,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { UserKind } from '@generated/prisma';

export class CreateUserDto {
  @ApiProperty({
    description: 'The email of the user',
    example: 'customer@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The password of the user',
    example: 'password',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    description: 'The name of the user',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The phone number of the user',
    example: '+19876543210',
  })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiProperty({
    description: 'The kind of the user',
    example: UserKind.USER,
    enum: UserKind,
  })
  @IsNotEmpty()
  @IsEnum(UserKind)
  kind: UserKind;

  @ApiProperty({
    description: 'The role ids of the user',
    example: ['cuid1', 'cuid2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  role_ids?: string[];
}

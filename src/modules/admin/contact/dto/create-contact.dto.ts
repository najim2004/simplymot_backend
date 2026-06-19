import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminContactDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  first_name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
  })
  last_name: string;

  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'Email',
    example: 'customer@example.com',
  })
  email: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
  })
  phone_number?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Message',
    example: 'Hello, I have a question about your product.',
  })
  message: string;
}

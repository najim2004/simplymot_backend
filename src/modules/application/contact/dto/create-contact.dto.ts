import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePublicContactDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Full name',
    example: 'John Doe',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Garage name',
    example: "Najim's Garage",
  })
  garage_name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Primary contact person name',
    example: 'Najim Uddin',
  })
  primary_contact?: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Contact email address',
    example: 'john@example.com',
  })
  email: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+447123456789',
  })
  phone_number?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Message content',
    example: 'I would like to inquire about garage services.',
  })
  message: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Source of contact message',
    example: 'Garage',
  })
  source?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'First name',
    example: 'John',
  })
  first_name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Doe',
  })
  last_name?: string;
}

import {
  IsString,
  IsOptional,
  IsEmail,
  MaxLength,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek, ServiceType } from 'prisma/generated/enums';

export class UpdateGarageDto {
  @ApiPropertyOptional({
    description: 'Garage name (max 100 chars)',
    example: 'ABC Auto Works',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  garage_name?: string;

  @ApiPropertyOptional({
    description: 'Vehicle Tax Stamp number',
    example: 'VTS-123456789',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  vts_number?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'contact@abcgarage.com',
  })
  @IsEmail()
  @IsOptional()
  contact_email?: string;

  @ApiPropertyOptional({
    description: 'Phone number (international format)',
    example: '+8801712345678',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone_number?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'UK',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  country?: string;

  @ApiPropertyOptional({
    description: 'State/Division',
    example: 'London',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  state?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'London',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  city?: string;

  @ApiPropertyOptional({
    description: 'ZIP/Postal code',
    example: 'SW1A 0AA',
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  post_code?: string;

  @ApiPropertyOptional({
    description: 'Full address',
    example: '123 Main Street, London, SW1A 0AA',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Garage image file (JPG, PNG, max 20MB)',
  })
  @IsOptional()
  garage_image?: Express.Multer.File;
}

export class ServiceDto {
  @ApiProperty({
    description: 'Service ID',
    example: '1',
  })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({
    description: 'Service title',
    example: 'MOT',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Service type',
    example: 'MOT',
  })
  @IsOptional()
  @IsEnum(ServiceType)
  type?: ServiceType = ServiceType.OTHERS;

  @ApiProperty({
    description: 'Service price',
    example: 50,
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    description: 'Vehicle class (e.g. Class 4, Class 7)',
    example: 'Class 4',
  })
  @IsString()
  @IsOptional()
  vehicle_class?: string;
}

export class UpsertServiceDto {
  @ApiProperty({
    description: 'Services',
    example: [
      {
        id: '1',
        title: 'MOT',
        type: 'MOT',
        price: 50,
      },
      {
        id: '2',
        title: 'Service',
        type: 'RETEST',
        price: 50,
      },
      {
        id: '3',
        title: 'Service',
        type: 'SERVICE',
        price: 50,
      },
    ],
  })
  @IsArray()
  @IsOptional()
  services?: ServiceDto[];
}

export class ScheduleIntervalDto {
  @ApiProperty({
    description: 'Schedule interval ID',
    example: 'cuid',
  })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({
    description: 'Day of week',
    example: 'MONDAY',
  })
  @IsEnum(DayOfWeek)
  @IsOptional()
  day_of_week?: DayOfWeek;

  @ApiProperty({
    description: 'Is closed',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  is_closed?: boolean;

  @ApiProperty({
    description: 'Slot duration',
    example: 60,
  })
  @IsNumber()
  @IsOptional()
  slot_duration?: number;

  @ApiProperty({
    description: 'Buffer time',
    example: 10,
  })
  @IsNumber()
  @IsOptional()
  buffer_time?: number;

  @ApiProperty({
    description: 'Open time',
    example: '09:00',
  })
  @IsString()
  @IsOptional()
  open_time?: string;

  @ApiProperty({
    description: 'Close time',
    example: '17:00',
  })
  @IsString()
  @IsOptional()
  close_time?: string;
}

export class UpsertScheduleDto {
  @ApiProperty({
    description:
      'Schedule intervals (if id is provided, it will be updated, otherwise it will be created)',
    example: [
      {
        id: 'cuid',
        day_of_week: DayOfWeek.MONDAY,
        is_closed: false,
        slot_duration: 60,
        buffer_time: 10,
        open_time: '09:00',
        close_time: '17:00',
      },
      {
        id: 'cuid',
        day_of_week: DayOfWeek.TUESDAY,
        is_closed: false,
        slot_duration: 60,
        buffer_time: 10,
        open_time: '09:00',
        close_time: '17:00',
      },
    ],
  })
  @IsArray()
  @IsOptional()
  schedule_intervals?: ScheduleIntervalDto[];
}

import {
  IsString,
  IsOptional,
  IsNotEmpty,
  Matches,
  IsNumber,
  IsEnum,
  IsDate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class GetGarageHolidaysQueryDto {
  @ApiPropertyOptional({
    description: 'Year',
    example: '2022',
  })
  @IsString()
  @IsOptional()
  year?: string;
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum Sort {
  DISTANCE = 'distance',
  RATING = 'rating',
  PRICE = 'price',
  REVIEWS = 'reviews',
}

export class DiscoverGarageQueryDto {
  @ApiProperty({
    description: 'Vehicle registration number',
    example: 'AB12 CDE',
    pattern: '^[A-Z0-9 ]{1,10}$',
  })
  @IsString()
  @IsNotEmpty({ message: 'Registration number is required' })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      : value,
  )
  @Matches(/^[A-Z0-9]{1,10}$/, {
    message:
      'Registration number must be 1-10 characters, letters and numbers only',
  })
  vehicle_registration_number: string;

  @ApiProperty({
    description: 'UK postcode for garage search',
    example: 'M1 1AA',
    pattern: '^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$',
  })
  @IsString()
  @IsNotEmpty({ message: 'Postcode is required' })
  @Matches(/^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i, {
    message: 'Please enter a valid UK postcode',
  })
  post_code: string;

  @ApiProperty({
    description: 'Page number',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Limit number',
    example: 10,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    description: 'Sort order',
    example: SortOrder.ASC,
    enum: SortOrder,
  })
  @IsEnum(SortOrder)
  @IsOptional()
  sort_order?: SortOrder = SortOrder.ASC;

  @ApiProperty({
    description: 'Sort',
    example: Sort.DISTANCE,
    enum: Sort,
  })
  @IsEnum(Sort)
  @IsOptional()
  sort?: Sort = Sort.DISTANCE;
}

export class GetGarageSlotsQueryDto {
  @ApiPropertyOptional({
    description: 'Date',
    example: '2022-01-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;
}

export class BlockUnblockSlotsDto {
  @ApiPropertyOptional({
    description: 'Id',
    example: 'cuid',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({
    description: 'Start Time',
    example: '2026-04-20T13:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_time?: Date;

  @ApiPropertyOptional({
    description: 'End Time',
    example: '2026-04-20T14:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_time?: Date;

  @ApiPropertyOptional({
    description: 'Description',
    example: 'Blocked',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

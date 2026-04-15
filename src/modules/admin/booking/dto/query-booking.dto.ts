import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { BookingStatus } from 'prisma/generated/client';

export class QueryBookingDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'customer id or garage id',
    example: 'cuid',
  })
  id?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Search',
    example: 'John Doe',
  })
  search?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiProperty({
    description: 'From date',
    example: '2026-01-01',
  })
  from_date?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiProperty({
    description: 'To date',
    example: '2026-01-01',
  })
  to_date?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({
    description: 'Page number',
    example: 1,
  })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({
    description: 'Limit number',
    example: 10,
  })
  limit?: number;

  @IsOptional()
  @IsEnum(BookingStatus)
  @ApiProperty({
    description: 'Status',
    example: BookingStatus.PENDING,
    enum: BookingStatus,
  })
  status?: BookingStatus;
}

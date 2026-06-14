import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { BookingStatus } from 'prisma/generated/enums';

export class QueryBookingDto {
  @ApiPropertyOptional({ example: 'clx1234567890abcdef' })
  @IsOptional()
  @IsString()
  garage_id?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from_date?: Date;

  @ApiPropertyOptional({ example: '2026-01-31' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to_date?: Date;

  @ApiPropertyOptional({ enum: BookingStatus, example: BookingStatus.PENDING })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

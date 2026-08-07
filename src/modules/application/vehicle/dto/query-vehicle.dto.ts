import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsDate } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryMotHistoryDto {
  @ApiPropertyOptional({ description: 'Search term', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Page size limit',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Start date filter',
    type: String,
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date_from?: Date;

  @ApiPropertyOptional({
    description: 'End date filter',
    type: String,
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date_to?: Date;
}

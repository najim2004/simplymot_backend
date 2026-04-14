import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum VehicleExpiryStatus {
  ALL = 'ALL',
  EXPIRED = 'EXPIRED',
  EXPIRED_SOON = 'EXPIRED_SOON',
  NOT_EXPIRED = 'NOT_EXPIRED',
}

export enum VehicleSortBy {
  CREATED_AT = 'CREATED_AT',
  EXPIRY_SOON = 'EXPIRY_SOON',
}

export class QueryVehicleDto {
  @ApiProperty({
    description: 'Search by vehicle registration number',
    example: '1234567890',
  })
  @IsOptional()
  @IsString()
  search: string;

  @ApiProperty({
    description: 'Page number',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page: number;

  @ApiProperty({
    description: 'Limit number',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit: number;

  @ApiProperty({
    description: 'From date',
    example: new Date(),
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from_date?: Date;

  @ApiProperty({
    description: 'To date',
    example: new Date(),
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to_date?: Date;

  @ApiProperty({
    description: 'Expiry status',
    example: VehicleExpiryStatus.ALL,
    enum: VehicleExpiryStatus,
  })
  @IsOptional()
  @IsEnum(VehicleExpiryStatus)
  expiry_status?: VehicleExpiryStatus = VehicleExpiryStatus.ALL;

  @ApiProperty({
    description: 'Sort by',
    example: VehicleSortBy.EXPIRY_SOON,
    enum: VehicleSortBy,
  })
  @IsOptional()
  @IsEnum(VehicleSortBy)
  sort_by?: VehicleSortBy = VehicleSortBy.EXPIRY_SOON;
}

export class QueryVehicleHistoryDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiProperty({
    description: 'Limit number',
    example: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiProperty({
    description: 'Search by test number',
    example: '1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}

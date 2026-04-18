import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  PaymentTransactionKind,
  PaymentTransactionStatus,
  UserKind,
} from 'prisma/generated/enums';

export class QueryTransactionDto {
  @ApiProperty({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ description: 'Page size', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @ApiProperty({
    description: 'Filter by status',
    enum: PaymentTransactionStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentTransactionStatus)
  status?: PaymentTransactionStatus;

  @ApiProperty({
    description: 'Filter by transaction kind',
    enum: PaymentTransactionKind,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentTransactionKind)
  kind?: PaymentTransactionKind;

  @ApiProperty({
    description: 'Search in reference_number (partial)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by user id',
    required: false,
  })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiProperty({
    description: 'Filter by linked user kind (USER, DRIVER, GARAGE, ADMIN)',
    enum: UserKind,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserKind)
  user_kind?: UserKind;
}

import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceKind, InvoiceStatus } from '@generated/prisma/enums';

export class QueryInvoiceDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ enum: InvoiceKind })
  @IsOptional()
  @IsEnum(InvoiceKind)
  kind?: InvoiceKind;

  @ApiPropertyOptional({ example: 'INV-2026-000001' })
  @IsOptional()
  @IsString()
  search?: string;
}

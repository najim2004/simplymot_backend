import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export enum PromoCodeTypeDto {
  ONCE = 'ONCE',
  REPEATING = 'REPEATING',
  FOREVER = 'FOREVER',
}

export class CreatePromoCodeDto {
  @ApiPropertyOptional({ example: 'Garage launch free access' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'FREE3MONTHS',
    description: 'Leave empty to auto-generate a code',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    example: 'GARAGE',
    description: 'Optional prefix for auto-generated promo codes',
  })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiPropertyOptional({ example: 100, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  percent_off?: number;

  @ApiProperty({
    enum: PromoCodeTypeDto,
    example: PromoCodeTypeDto.REPEATING,
  })
  @IsEnum(PromoCodeTypeDto)
  type: PromoCodeTypeDto;

  @ApiProperty({
    example: 3,
    description:
      'Stripe repeating duration in months (required when type is REPEATING)',
  })
  @ValidateIf((dto) => dto.type === PromoCodeTypeDto.REPEATING)
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration_in_months?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_redemptions?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expires_at?: string;
}

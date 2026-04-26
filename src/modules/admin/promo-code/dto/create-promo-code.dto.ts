import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export enum PromoCodeDurationDto {
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
    enum: PromoCodeDurationDto,
    example: PromoCodeDurationDto.REPEATING,
  })
  @IsEnum(PromoCodeDurationDto)
  duration: PromoCodeDurationDto;

  @ApiPropertyOptional({
    example: 90,
    description:
      'Business duration in days. Stripe repeating coupons use months, so this is converted.',
  })
  @ValidateIf((dto) => dto.duration === PromoCodeDurationDto.REPEATING)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1825)
  duration_days?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Optional direct Stripe repeating duration in months',
  })
  @ValidateIf((dto) => dto.duration === PromoCodeDurationDto.REPEATING)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
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

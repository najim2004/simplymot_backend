import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsString,
  IsNumber,
  Min,
  IsBoolean,
  IsArray,
  IsEnum,
} from 'class-validator';
import { PeriodType, SubscriptionPlanStatus } from 'prisma/generated/enums';

export class CreateSubscriptionDto {}

export class CreateSubscriptionPlanDto {
  @ApiProperty({
    description: 'Plan name (e.g., Basic, Premium, Enterprise)',
    example: 'Premium Plan',
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Plan description',
    example: 'Premium plan with advanced features and priority support',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Monthly price in pence (e.g., 2999 = £29.99)',
    example: 2999,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price_pence: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'GBP',
    default: 'GBP',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'GBP';

  @ApiProperty({
    description: 'Whether plan is active and available for subscription',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsEnum(SubscriptionPlanStatus)
  status?: SubscriptionPlanStatus = SubscriptionPlanStatus.ACTIVE;

  @ApiProperty({
    description:
      'Trial period in days (0 = no trial, business controls trial length)',
    example: 14,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  trial_period_days?: number = 0;

  @ApiProperty({
    description: 'Period type',
    example: PeriodType.MONTH,
    default: PeriodType.MONTH,
  })
  @IsOptional()
  @IsEnum(PeriodType)
  period_type?: PeriodType = PeriodType.MONTH;
}

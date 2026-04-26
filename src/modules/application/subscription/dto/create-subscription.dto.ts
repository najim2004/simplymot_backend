import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryAvailableSubscriptionPlansDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class SubscriptionCheckoutDto {
  @ApiProperty({
    description: 'Subscription plan ID to subscribe to',
    example: 'cuid',
  })
  @IsNotEmpty()
  @IsString()
  plan_id: string;

  @ApiPropertyOptional({
    description: 'Optional promo code to apply to the subscription checkout',
    example: 'FREE3MONTHS',
  })
  @IsOptional()
  @IsString()
  promo_code?: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'Switching plan',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateSubscriptionDto extends SubscriptionCheckoutDto {}

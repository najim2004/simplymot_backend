import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Subscription plan ID',
    example: 'cuid',
  })
  @IsNotEmpty()
  @IsString()
  plan_id: string;

  @ApiPropertyOptional({
    description: 'Optional promo code',
    example: 'FREE3MONTHS',
  })
  @IsOptional()
  @IsString()
  promo_code?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidatePromoCodeDto {
  @ApiProperty({
    description: 'Subscription plan ID',
    example: 'cuid',
  })
  @IsNotEmpty()
  @IsString()
  plan_id: string;

  @ApiProperty({
    description: 'Promo code to validate',
    example: 'FREE3MONTHS',
  })
  @IsNotEmpty()
  @IsString()
  code: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'Switching plan',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description:
      'Cancel immediately. Defaults to false (cancel at current period end).',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  cancel_immediately?: boolean = false;
}

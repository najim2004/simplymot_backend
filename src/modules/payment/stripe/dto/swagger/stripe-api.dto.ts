import { ApiProperty } from '@nestjs/swagger';

export class StripeWebhookResponseDto {
  @ApiProperty({ example: true })
  received: boolean;
}

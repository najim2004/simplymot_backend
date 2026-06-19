import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/common/swagger/dto/api-response.dto';

export class AdminSubscriptionPlanDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty()
  price_pence: number;

  @ApiProperty()
  period_type: string;

  @ApiPropertyOptional()
  trial_period_days?: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiPropertyOptional({ nullable: true })
  stripe_price_id?: string | null;

  @ApiPropertyOptional({ nullable: true })
  stripe_product_id?: string | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  subscriptions_by_status?: Record<string, number>;

  @ApiPropertyOptional()
  total_subscriptions?: number;
}

export class CreateSubscriptionPlanResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: AdminSubscriptionPlanDto })
  data: AdminSubscriptionPlanDto;
}

export class ListSubscriptionPlansResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [AdminSubscriptionPlanDto] })
  data: AdminSubscriptionPlanDto[];

  @ApiProperty({ name: 'meta_data', type: PaginationMetaDto })
  meta_data: PaginationMetaDto;
}

export class SyncStripePlanResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: AdminSubscriptionPlanDto })
  data: AdminSubscriptionPlanDto;
}

export class GetSubscriptionPlanResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: AdminSubscriptionPlanDto })
  data: AdminSubscriptionPlanDto;
}

export class UpdateSubscriptionPlanResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: AdminSubscriptionPlanDto })
  data: AdminSubscriptionPlanDto;
}

export class DeleteSubscriptionPlanResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: AdminSubscriptionPlanDto })
  data: AdminSubscriptionPlanDto;
}

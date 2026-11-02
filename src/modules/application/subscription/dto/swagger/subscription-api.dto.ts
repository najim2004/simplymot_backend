import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/common/swagger/dto/api-response.dto';

export class SubscriptionPlanDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty()
  price_pence: number;

  @ApiProperty({ example: 'GBP' })
  currency: string;

  @ApiProperty({ example: '£29.99' })
  price_formatted: string;

  @ApiProperty()
  period_type: string;

  @ApiPropertyOptional()
  trial_period_days?: number;

  @ApiProperty()
  is_checkout_ready: boolean;

  @ApiPropertyOptional({ example: false })
  is_current_plan?: boolean;

  @ApiPropertyOptional({ example: false })
  has_subscription?: boolean;
}

export class SubscriptionPlanBillingDto {
  @ApiProperty({ type: String, format: 'date-time' })
  current_period_start: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  current_period_end: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  next_billing_date: Date;
}

export class SubscriptionPlanStatusDetailsDto {
  @ApiProperty()
  has_access: boolean;

  @ApiProperty()
  will_renew: boolean;

  @ApiProperty()
  cancellation_scheduled: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  access_until: Date;
}

export class FormattedSubscriptionPlanDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  subscription_type: string;

  @ApiProperty()
  can_cancel: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty({ type: SubscriptionPlanDto })
  plan: SubscriptionPlanDto;

  @ApiProperty({ type: SubscriptionPlanBillingDto })
  billing: SubscriptionPlanBillingDto;

  @ApiProperty({ type: SubscriptionPlanStatusDetailsDto })
  status_details: SubscriptionPlanStatusDetailsDto;

  @ApiPropertyOptional({ nullable: true })
  trial: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  cancellation: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  stripe_subscription_id: string | null;
}

export class SubscriptionCheckoutDto {
  @ApiProperty()
  checkout_url: string;

  @ApiProperty()
  session_id: string;

  @ApiProperty()
  subscription_id: string;
}

export class SubscriptionStatusSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  plan_id: string;

  @ApiProperty()
  plan_name: string;

  @ApiProperty()
  price_pence: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  price_formatted: string;

  @ApiProperty()
  has_access: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  current_period_end: Date;

  @ApiProperty()
  cancel_at_period_end: boolean;
}

export class SubscriptionStatusDataDto {
  @ApiProperty()
  has_subscription: boolean;

  @ApiPropertyOptional({ type: SubscriptionStatusSummaryDto, nullable: true })
  subscription: SubscriptionStatusSummaryDto | null;
}

export class SubscriptionCancelDataDto {
  @ApiProperty({ type: FormattedSubscriptionPlanDto })
  subscription: FormattedSubscriptionPlanDto;

  @ApiProperty({ type: String, format: 'date-time' })
  effective_date: Date;

  @ApiProperty()
  cancelled_immediately: boolean;
}

export class SubscriptionCheckoutSuccessDataDto {
  @ApiProperty()
  session_id: string;

  @ApiProperty({ type: FormattedSubscriptionPlanDto })
  subscription: FormattedSubscriptionPlanDto;
}

export class ListSubscriptionPlansResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [SubscriptionPlanDto] })
  data: SubscriptionPlanDto[];

  @ApiProperty({ name: 'meta_data', type: PaginationMetaDto })
  meta_data: PaginationMetaDto;
}

export class SubscribeResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: SubscriptionCheckoutDto })
  data: SubscriptionCheckoutDto;
}

export class SubscriptionStatusResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: SubscriptionStatusDataDto })
  data: SubscriptionStatusDataDto;
}

export class CancelSubscriptionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: SubscriptionCancelDataDto })
  data: SubscriptionCancelDataDto;
}

export class ValidateCheckoutSessionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: SubscriptionCheckoutSuccessDataDto })
  data: SubscriptionCheckoutSuccessDataDto;
}

export class PlanDetailsDataDto {
  @ApiProperty({ type: SubscriptionPlanDto })
  plan: SubscriptionPlanDto;

  @ApiPropertyOptional({ nullable: true })
  subscription: Record<string, unknown> | null;

  @ApiProperty({ example: true })
  is_current_plan: boolean;

  @ApiProperty({ example: true })
  has_subscription: boolean;
}

export class GetSubscriptionPlanDetailsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Subscription plan details fetched successfully' })
  message: string;

  @ApiProperty({ type: PlanDetailsDataDto })
  data: PlanDetailsDataDto;
}

export class ValidatePromoCodeDataDto {
  @ApiProperty({ example: true })
  valid: boolean;

  @ApiProperty({ example: 'SAVE50' })
  code: string;

  @ApiPropertyOptional({ example: 'Summer Special' })
  name?: string;

  @ApiProperty({ example: 50 })
  percent_off: number;

  @ApiProperty({ example: 250 })
  discount_pence: number;

  @ApiProperty({ example: '£2.50' })
  discount_formatted: string;

  @ApiProperty({ example: 250 })
  final_price_pence: number;

  @ApiProperty({ example: '£2.50' })
  final_price_formatted: string;

  @ApiPropertyOptional({ example: 'ONCE' })
  duration?: string;
}

export class ValidatePromoCodeResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Promo code applied successfully' })
  message: string;

  @ApiProperty({ type: ValidatePromoCodeDataDto })
  data: ValidatePromoCodeDataDto;
}

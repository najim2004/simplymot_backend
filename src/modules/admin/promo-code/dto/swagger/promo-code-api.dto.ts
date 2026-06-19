import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/common/swagger/dto/api-response.dto';

export class PromoCodeDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at: Date;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  percent_off: number;

  @ApiProperty()
  duration: string;

  @ApiPropertyOptional({ nullable: true })
  duration_days: number | null;

  @ApiPropertyOptional({ nullable: true })
  duration_in_months: number | null;

  @ApiProperty()
  max_redemptions: number;

  @ApiProperty()
  redeemed_count: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  expires_at: Date | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ nullable: true })
  stripe_coupon_id: string | null;

  @ApiPropertyOptional({ nullable: true })
  stripe_promotion_code_id: string | null;

  @ApiPropertyOptional({ nullable: true })
  created_by_id: string | null;

  @ApiPropertyOptional({ nullable: true })
  display_duration: string | null;

  @ApiPropertyOptional({ nullable: true })
  remaining_redemptions: number | null;
}

export class CreatePromoCodeResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: PromoCodeDto })
  data: PromoCodeDto;
}

export class ListPromoCodesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [PromoCodeDto] })
  data: PromoCodeDto[];

  @ApiProperty({ name: 'meta_data', type: PaginationMetaDto })
  meta_data: PaginationMetaDto;
}

export class DeactivatePromoCodeResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: PromoCodeDto })
  data: PromoCodeDto;
}

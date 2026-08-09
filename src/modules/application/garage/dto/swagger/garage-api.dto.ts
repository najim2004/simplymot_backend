import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IdOnlyDto,
  PaginationMetaDto,
} from 'src/common/swagger/dto/api-response.dto';

export class GarageProfileDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  garage_name: string | null;

  @ApiPropertyOptional({ nullable: true })
  vts_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  contact_email: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;

  @ApiPropertyOptional({ nullable: true })
  garage_image: string | null;

  @ApiPropertyOptional({ nullable: true })
  mot_price: number | null;

  @ApiPropertyOptional({ nullable: true })
  post_code: string | null;
}

export class DiscoverVehicleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  registration_number: string;

  @ApiPropertyOptional({ nullable: true })
  make: string | null;

  @ApiPropertyOptional({ nullable: true })
  model: string | null;

  @ApiPropertyOptional({ nullable: true })
  color: string | null;

  @ApiPropertyOptional({ nullable: true })
  fuel_type: string | null;

  @ApiPropertyOptional({ nullable: true })
  engine_capacity: number | null;

  @ApiPropertyOptional({ nullable: true })
  co2_emissions: number | null;

  @ApiPropertyOptional({ nullable: true })
  mot_status: string | null;

  @ApiProperty()
  is_expired: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  mot_expiry_date: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  mot_last_checked_at: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  reminder_last_sent_at: Date | null;

  @ApiPropertyOptional({ nullable: true })
  year_of_manufacture: number | null;
}

export class DiscoverGarageItemDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  garage_name: string | null;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;

  @ApiPropertyOptional({ nullable: true })
  post_code: string | null;

  @ApiPropertyOptional({ nullable: true })
  vts_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  garage_image: string | null;

  @ApiPropertyOptional({ nullable: true })
  mot_price: number | null;

  @ApiProperty()
  total_bookings: number;

  @ApiProperty()
  exact_post_code_match: boolean;

  @ApiProperty()
  distance_miles: number;
}

export class DiscoverGaragesDataDto {
  @ApiProperty({ type: DiscoverVehicleDto })
  vehicle: DiscoverVehicleDto;

  @ApiProperty({ type: [DiscoverGarageItemDto] })
  garages: DiscoverGarageItemDto[];
}

export class DiscoverFiltersMetaDto {
  @ApiPropertyOptional({ nullable: true })
  sort: string | null;

  @ApiPropertyOptional({ nullable: true })
  sort_order: string | null;
}

export class DiscoverGaragesMetaDto extends PaginationMetaDto {
  @ApiPropertyOptional({ nullable: true })
  vehicle_registration_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  post_code: string | null;

  @ApiProperty({ type: DiscoverFiltersMetaDto })
  filters: DiscoverFiltersMetaDto;
}

export class GarageServiceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  type: string;

  @ApiPropertyOptional({ nullable: true })
  vehicle_class?: string | null;
}

export class MotClassGroupDto {
  @ApiPropertyOptional({ nullable: true })
  vehicle_class: string | null;

  @ApiPropertyOptional({ type: GarageServiceDto, nullable: true })
  mot: GarageServiceDto | null;

  @ApiPropertyOptional({ type: GarageServiceDto, nullable: true })
  mot_retest: GarageServiceDto | null;
}

export class GarageServicesBundleDto {
  @ApiProperty({ type: [MotClassGroupDto] })
  mot_services: MotClassGroupDto[];

  @ApiProperty({ type: [GarageServiceDto] })
  other_services: GarageServiceDto[];
}

export class ScheduleIntervalDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  day_of_week: string;

  @ApiProperty()
  is_closed: boolean;

  @ApiProperty()
  slot_duration: number;

  @ApiProperty()
  buffer_time: number;

  @ApiPropertyOptional({ nullable: true, example: '09:00' })
  open_time: string | null;

  @ApiPropertyOptional({ nullable: true, example: '17:00' })
  close_time: string | null;
}

export class GarageScheduleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  garage_id: string;

  @ApiProperty({ type: [ScheduleIntervalDto] })
  schedule_intervals: ScheduleIntervalDto[];
}

export class DiscoverGarageDetailDto extends GarageProfileDto {
  @ApiPropertyOptional({ nullable: true })
  post_code: string | null;

  @ApiProperty({ type: GarageServicesBundleDto })
  services: GarageServicesBundleDto;

  @ApiProperty({ type: GarageScheduleDto })
  schedule: GarageScheduleDto;
}

export class BreakTimeDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  starts_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  ends_at: Date;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;
}

export class HolidayDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  date: Date;

  @ApiProperty()
  name: string;
}

export class SlotItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  starts_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  ends_at: Date;

  @ApiProperty()
  source: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  bookable: boolean;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;
}

export class SlotsSummaryDto {
  @ApiProperty()
  total_slots: number;

  @ApiProperty()
  past_slots: number;

  @ApiProperty()
  break_slots: number;

  @ApiProperty()
  available_slots: number;

  @ApiProperty()
  booked_slots: number;

  @ApiProperty()
  blocked_slots: number;

  @ApiProperty()
  bookable_slots: number;
}

export class GarageSlotsDataDto {
  @ApiProperty()
  garage_id: string;

  @ApiProperty()
  schedule_id: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  day_of_week: string;

  @ApiProperty()
  is_closed: boolean;

  @ApiProperty()
  is_holiday: boolean;

  @ApiPropertyOptional({ nullable: true })
  holiday_name: string | null;

  @ApiProperty()
  slot_duration: number;

  @ApiProperty()
  buffer_time: number;

  @ApiProperty()
  open_time: string;

  @ApiProperty()
  close_time: string;

  @ApiProperty({ type: [SlotItemDto] })
  slots: SlotItemDto[];

  @ApiProperty({ type: SlotsSummaryDto })
  summary: SlotsSummaryDto;
}

export class GetGarageResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: GarageProfileDto })
  data: GarageProfileDto;
}

export class DiscoverGaragesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: DiscoverGaragesDataDto })
  data: DiscoverGaragesDataDto;

  @ApiProperty({ name: 'meta_data', type: DiscoverGaragesMetaDto })
  meta_data: DiscoverGaragesMetaDto;
}

export class DiscoverGarageResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: DiscoverGarageDetailDto })
  data: DiscoverGarageDetailDto;
}

export class ScheduleResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: GarageScheduleDto })
  data: GarageScheduleDto;
}

export class BreakTimeResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: BreakTimeDto })
  data: BreakTimeDto;
}

export class BreakTimesListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [BreakTimeDto] })
  data: BreakTimeDto[];
}

export class HolidayResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: HolidayDto })
  data: HolidayDto;
}

export class HolidaysListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [HolidayDto] })
  data: HolidayDto[];
}

export class SlotsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: GarageSlotsDataDto })
  data: GarageSlotsDataDto;
}

export class SlotActionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: SlotItemDto })
  data: SlotItemDto;
}

export class ServicesBundleResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: GarageServicesBundleDto })
  data: GarageServicesBundleDto;
}

export class ServiceListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [GarageServiceDto] })
  data: GarageServiceDto[];
}

export class DeleteServiceResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: IdOnlyDto })
  data: IdOnlyDto;
}

export class UpdateGarageResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: GarageProfileDto })
  data: GarageProfileDto;
}

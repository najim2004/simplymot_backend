import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/common/swagger/dto/api-response.dto';

export class BookingCreatedGarageDto {
  @ApiPropertyOptional({ nullable: true })
  garage_name: string | null;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;
}

export class BookingCreatedSlotDto {
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  starts_at: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  ends_at: Date | null;
}

export class BookingCreatedVehicleDto {
  @ApiPropertyOptional({ nullable: true })
  registration_number: string | null;
}

export class BookingCreatedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  order_id: string;

  @ApiPropertyOptional({ nullable: true })
  additional_services: string | null;

  @ApiProperty({ type: () => BookingCreatedGarageDto })
  garage: BookingCreatedGarageDto;

  @ApiProperty({ type: () => BookingCreatedSlotDto })
  slot: BookingCreatedSlotDto;

  @ApiPropertyOptional({ type: () => BookingCreatedVehicleDto, nullable: true })
  vehicle: BookingCreatedVehicleDto | null;
}

export class BookingListCustomerDto {
  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatar: string | null;
}

export class BookingListGarageDto {
  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  image: string | null;
}

export class BookingListVehicleDto {
  @ApiProperty()
  registration_number: string;

  @ApiPropertyOptional({ nullable: true })
  make: string | null;

  @ApiPropertyOptional({ nullable: true })
  model: string | null;
}

export class BookingListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: String, format: 'date-time' })
  starts_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  ends_at: Date;

  @ApiProperty()
  service_price: number;

  @ApiProperty({ type: BookingListCustomerDto })
  customer: BookingListCustomerDto;

  @ApiProperty({ type: BookingListGarageDto })
  garage: BookingListGarageDto;

  @ApiProperty({ type: BookingListVehicleDto })
  vehicle: BookingListVehicleDto;
}

export class BookingListFiltersMetaDto {
  @ApiPropertyOptional({ nullable: true })
  garage_id: string | null;

  @ApiPropertyOptional({ nullable: true })
  from_date: string | null;

  @ApiPropertyOptional({ nullable: true })
  to_date: string | null;

  @ApiPropertyOptional({ nullable: true })
  status: string | null;
}

export class BookingListMetaDto extends PaginationMetaDto {
  @ApiProperty({ type: BookingListFiltersMetaDto })
  filters: BookingListFiltersMetaDto;
}

export class BookingSlotDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  starts_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  ends_at: Date;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;
}

export class BookingDetailVehicleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  registration_number: string;

  @ApiPropertyOptional({ nullable: true })
  make: string | null;

  @ApiPropertyOptional({ nullable: true })
  model: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  last_mot_test_date: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  last_mot_expiry_date: Date | null;

  @ApiPropertyOptional({ nullable: true })
  last_mot_status: string | null;
}

export class BookingItemServiceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  price: number;
}

export class BookingItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unit_price: number;

  @ApiProperty({ type: BookingItemServiceDto })
  service: BookingItemServiceDto;
}

export class BookingDetailGarageDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  garage_name: string | null;

  @ApiPropertyOptional({ nullable: true })
  garage_image: string | null;

  @ApiPropertyOptional({ nullable: true })
  contact_email: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  vts_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;

  @ApiPropertyOptional({ nullable: true })
  post_code: string | null;
}

export class BookingDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  order_date: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  garage_id: string;

  @ApiProperty()
  customer_id: string;

  @ApiProperty()
  vehicle_id: string;

  @ApiPropertyOptional({ nullable: true })
  slot_id: string | null;

  @ApiProperty()
  total_amount: number;

  @ApiPropertyOptional({ type: [String] })
  additional_services?: string[];

  @ApiPropertyOptional({ nullable: true })
  cancel_reason: string | null;

  @ApiPropertyOptional({ nullable: true })
  cancelled_by: string | null;

  @ApiProperty({ type: BookingSlotDto })
  slot: BookingSlotDto;

  @ApiProperty({ type: BookingDetailVehicleDto })
  vehicle: BookingDetailVehicleDto;

  @ApiProperty({ type: [BookingItemDto] })
  items: BookingItemDto[];

  @ApiProperty({ type: BookingDetailGarageDto })
  garage: BookingDetailGarageDto;
}

export class BookingCancelledDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'CANCELLED' })
  status: string;

  @ApiPropertyOptional({ nullable: true })
  cancel_reason: string | null;

  @ApiPropertyOptional({ nullable: true })
  cancelled_by: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at: Date;
}

export class BookingRescheduledDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  garage_id: string;

  @ApiProperty()
  slot_id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  order_date: Date;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at: Date;
}

export class CreateBookingResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Booking created successfully' })
  message: string;

  @ApiProperty({ type: BookingCreatedDto })
  data: BookingCreatedDto;
}

export class ListBookingsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Bookings fetched successfully' })
  message: string;

  @ApiProperty({ type: [BookingListItemDto] })
  data: BookingListItemDto[];

  @ApiProperty({ name: 'meta_data', type: BookingListMetaDto })
  meta_data: BookingListMetaDto;
}

export class RescheduleBookingResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Booking rescheduled successfully' })
  message: string;

  @ApiProperty({ type: BookingRescheduledDto })
  data: BookingRescheduledDto;
}

export class CancelBookingResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Booking cancelled successfully' })
  message: string;

  @ApiProperty({ type: BookingCancelledDto })
  data: BookingCancelledDto;
}

export class GetBookingResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Booking fetched successfully' })
  message: string;

  @ApiProperty({ type: BookingDetailDto })
  data: BookingDetailDto;
}

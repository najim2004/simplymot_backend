import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/common/swagger/dto/api-response.dto';

export class AdminBookingListCustomerDto {
  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;
}

export class AdminBookingListVehicleDto {
  @ApiProperty()
  registration_number: string;
}

export class AdminBookingListGarageDto {
  @ApiPropertyOptional({ nullable: true })
  garage_name: string | null;
}

export class AdminBookingListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  order_date: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  total_amount: number;

  @ApiProperty({ type: AdminBookingListCustomerDto })
  customer: AdminBookingListCustomerDto;

  @ApiProperty({ type: AdminBookingListVehicleDto })
  vehicle: AdminBookingListVehicleDto;

  @ApiProperty({ type: AdminBookingListGarageDto })
  garage: AdminBookingListGarageDto;
}

export class AdminBookingOwnerDto {
  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatar: string | null;
}

export class AdminBookingDetailGarageDto {
  @ApiPropertyOptional({ nullable: true })
  garage_name: string | null;

  @ApiProperty({ type: AdminBookingOwnerDto })
  owner: AdminBookingOwnerDto;
}

export class AdminBookingDetailItemDto {
  @ApiProperty({ type: Object })
  service: { title: string; type: string };

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unit_price: number;
}

export class AdminBookingDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  order_date: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  total_amount: number;

  @ApiPropertyOptional({ type: [String] })
  additional_services?: string[];

  @ApiProperty({ type: AdminBookingListCustomerDto })
  customer: AdminBookingListCustomerDto;

  @ApiProperty({ type: Object })
  vehicle: { registration_number: string; make?: string; model?: string };

  @ApiProperty({ type: AdminBookingDetailGarageDto })
  garage: AdminBookingDetailGarageDto;

  @ApiProperty({ type: [AdminBookingDetailItemDto] })
  items: AdminBookingDetailItemDto[];
}

export class AdminListBookingsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [AdminBookingListItemDto] })
  data: AdminBookingListItemDto[];

  @ApiProperty({ name: 'meta_data', type: PaginationMetaDto })
  meta_data: PaginationMetaDto;
}

export class AdminGetBookingResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: AdminBookingDetailDto })
  data: AdminBookingDetailDto;
}

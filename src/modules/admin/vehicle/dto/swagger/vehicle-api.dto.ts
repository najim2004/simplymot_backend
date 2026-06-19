import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/common/swagger/dto/api-response.dto';

export class AdminVehicleListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  registration_number: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  mot_expiry_date: Date | null;

  @ApiPropertyOptional({ nullable: true })
  vehicle_owner_id: string | null;

  @ApiPropertyOptional({ nullable: true })
  vehicle_owner_name: string | null;

  @ApiPropertyOptional({ nullable: true })
  vehicle_owner_email: string | null;

  @ApiPropertyOptional({ nullable: true })
  vehicle_owner_phone_number: string | null;
}

export class AdminVehicleOwnerDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;
}

export class AdminVehicleDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  registration_number: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  mot_expiry_date: Date | null;

  @ApiProperty()
  is_expired: boolean;

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

  @ApiPropertyOptional({ nullable: true })
  year_of_manufacture: number | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  mot_last_checked_at: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  reminder_last_sent_at: Date | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  raw_mot_data: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  raw_dvla_data: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  raw_mot_status: string | null;

  @ApiProperty({ type: AdminVehicleOwnerDto })
  vehicle_owner: AdminVehicleOwnerDto;
}

export class AdminMotHistoryItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  test_date: Date;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ nullable: true })
  odometer_value: number | null;

  @ApiPropertyOptional({ nullable: true })
  odometer_unit: string | null;

  @ApiPropertyOptional({ nullable: true })
  odometer_result_type: string | null;

  @ApiPropertyOptional({ nullable: true })
  data_source: string | null;

  @ApiPropertyOptional({ nullable: true })
  registration_at_test: string | null;
}

export class AdminMotHistoryFiltersDto {
  @ApiPropertyOptional({ nullable: true })
  date_from: string | null;

  @ApiPropertyOptional({ nullable: true })
  date_to: string | null;
}

export class AdminMotHistoryMetaDto extends PaginationMetaDto {
  @ApiPropertyOptional({ nullable: true })
  search: string | null;

  @ApiProperty({ type: AdminMotHistoryFiltersDto })
  filters: AdminMotHistoryFiltersDto;
}

export class AdminListVehiclesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [AdminVehicleListItemDto] })
  data: AdminVehicleListItemDto[];

  @ApiProperty({ name: 'meta_data', type: PaginationMetaDto })
  meta_data: PaginationMetaDto;
}

export class AdminGetVehicleResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: AdminVehicleDetailDto })
  data: AdminVehicleDetailDto;
}

export class AdminMotHistoryResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [AdminMotHistoryItemDto] })
  data: AdminMotHistoryItemDto[];

  @ApiProperty({ name: 'meta_data', type: AdminMotHistoryMetaDto })
  meta_data: AdminMotHistoryMetaDto;
}

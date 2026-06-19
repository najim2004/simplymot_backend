import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/common/swagger/dto/api-response.dto';

export class VehicleDto {
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

  @ApiPropertyOptional({ nullable: true })
  user_id?: string | null;
}

export class MotHistoryItemDto {
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

export class MotHistoryFiltersDto {
  @ApiPropertyOptional({ nullable: true })
  date_from: string | null;

  @ApiPropertyOptional({ nullable: true })
  date_to: string | null;
}

export class MotHistoryMetaDto extends PaginationMetaDto {
  @ApiPropertyOptional({ nullable: true })
  search: string | null;

  @ApiProperty({ type: MotHistoryFiltersDto })
  filters: MotHistoryFiltersDto;
}

export class AddVehicleResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: VehicleDto })
  data: VehicleDto;
}

export class ListVehiclesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [VehicleDto] })
  data: VehicleDto[];
}

export class MotHistoryResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [MotHistoryItemDto] })
  data: MotHistoryItemDto[];

  @ApiProperty({ name: 'meta_data', type: MotHistoryMetaDto })
  meta_data: MotHistoryMetaDto;
}

export class DeleteVehicleResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: VehicleDto })
  data: VehicleDto;
}

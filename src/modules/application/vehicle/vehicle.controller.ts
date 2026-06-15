import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { AddVehicleDto } from './dto/create-vehicle.dto';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { QueryMotHistoryDto } from './dto/query-vehicle.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

const VEHICLE_ITEM = {
  id: 'clvehicle001',
  registration_number: 'AB12CDE',
  make: 'FORD',
  model: 'FOCUS',
  color: 'Blue',
  fuel_type: 'Petrol',
  engine_capacity: 1596,
  co2_emissions: 120,
  mot_status: 'Valid',
  is_expired: false,
  mot_expiry_date: '2026-08-15T00:00:00.000Z',
  mot_last_checked_at: '2026-03-01T10:00:00.000Z',
  reminder_last_sent_at: null,
  year_of_manufacture: 2019,
};

const MOT_HISTORY_ITEM = {
  id: 'clmothist001',
  test_date: '2025-08-15T00:00:00.000Z',
  status: 'PASSED',
  odometer_value: 45000,
  odometer_unit: 'mi',
  odometer_result_type: 'READ',
  data_source: 'DVSA',
  registration_at_test: 'AB12CDE',
};

const MOT_HISTORY_META = {
  total: 5,
  page: 1,
  limit: 10,
  search: null,
  filters: { date_from: null, date_to: null },
};

@ApiTags('Vehicle')
@ApiBearerAuth()
@Controller('vehicle')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @ApiOperation({
    summary: 'Add vehicle',
    description: 'JWT. Body: `registration_number`. Fetches DVLA/MOT data.',
  })
  @ApiSuccessResponse({
    message: 'Vehicle added successfully',
    data: VEHICLE_ITEM,
  })
  @Post()
  addVehicle(
    @Body() addVehicleDto: AddVehicleDto,
    @User('id') user_id: string,
  ) {
    return this.vehicleService.addVehicle(addVehicleDto, user_id);
  }

  @ApiOperation({
    summary: 'List my vehicles',
    description: 'JWT. User fleet with MOT status.',
  })
  @ApiSuccessResponse({
    message: 'Vehicles fetched successfully',
    data: [VEHICLE_ITEM],
  })
  @Get()
  getAllVehicles(@User('id') user_id: string) {
    return this.vehicleService.getAllVehicles(user_id);
  }

  @ApiOperation({
    summary: 'Get MOT history',
    description: 'JWT. Paginated MOT history for owned vehicle.',
  })
  @ApiSuccessResponse({
    message: 'MOT history fetched successfully',
    data: [MOT_HISTORY_ITEM],
    metaData: MOT_HISTORY_META,
  })
  @Get(':id/mot-history')
  getAllMothHistoryOfAVehicle(
    @Param('id') vehicle_id: string,
    @Query() queryMotHistoryDto: QueryMotHistoryDto,
    @User('id') user_id: string,
  ) {
    return this.vehicleService.getAllMothHistoryOfAVehicle(
      vehicle_id,
      queryMotHistoryDto,
      user_id,
    );
  }

  @ApiOperation({
    summary: 'Delete vehicle',
    description: 'JWT. Removes vehicle from fleet.',
  })
  @ApiSuccessResponse({
    message: 'Vehicle deleted successfully',
    data: { ...VEHICLE_ITEM, user_id: null },
  })
  @Delete(':id')
  deleteVehicle(@Param('id') vehicle_id: string, @User('id') user_id: string) {
    return this.vehicleService.deleteVehicle(vehicle_id, user_id);
  }
}

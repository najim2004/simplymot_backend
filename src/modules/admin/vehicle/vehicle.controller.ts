import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import {
  QueryVehicleDto,
  QueryVehicleHistoryDto,
} from './dto/query-vehicle.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

const VEHICLE_LIST_ITEM = {
  id: 'clvehicle001',
  registration_number: 'AB12CDE',
  mot_expiry_date: '2026-08-15T00:00:00.000Z',
  vehicle_owner_id: 'cluser001',
  vehicle_owner_name: 'John Driver',
  vehicle_owner_email: 'john@example.com',
  vehicle_owner_phone_number: '+441112223333',
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

@ApiTags('Admin Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @ApiOperation({
    summary: 'List vehicles',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Vehicles fetched successfully',
    data: [VEHICLE_LIST_ITEM],
    metaData: { total: 200, page: 1, limit: 10, pages: 20 },
  })
  @Get()
  getAllVehicles(@Query() query: QueryVehicleDto) {
    return this.vehicleService.getAllVehicles(query);
  }

  @ApiOperation({
    summary: 'Get vehicle',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Vehicle fetched successfully',
    data: {
      id: 'clvehicle001',
      registration_number: 'AB12CDE',
      mot_expiry_date: '2026-08-15T00:00:00.000Z',
      is_expired: false,
      make: 'FORD',
      model: 'FOCUS',
      color: 'Blue',
      fuel_type: 'Petrol',
      engine_capacity: 1596,
      co2_emissions: 120,
      mot_status: 'Valid',
      year_of_manufacture: 2019,
      mot_last_checked_at: '2026-03-01T10:00:00.000Z',
      reminder_last_sent_at: null,
      raw_mot_data: {},
      raw_dvla_data: {},
      raw_mot_status: 'Valid',
      vehicle_owner: {
        id: 'cluser001',
        name: 'John Driver',
        email: 'john@example.com',
        phone_number: '+441112223333',
      },
    },
  })
  @Get(':vehicle_id')
  getVehicleById(@Param('vehicle_id') vehicle_id: string) {
    return this.vehicleService.getVehicleById(vehicle_id);
  }

  @ApiOperation({
    summary: 'Get MOT history',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Vehicle history fetched successfully',
    data: [MOT_HISTORY_ITEM],
    metaData: MOT_HISTORY_META,
  })
  @Get(':vehicle_id/history')
  getVehicleHistory(
    @Param('vehicle_id') vehicle_id: string,
    @Query() query: QueryVehicleHistoryDto,
  ) {
    return this.vehicleService.getVehicleHistory(vehicle_id, query);
  }
}

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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiTags('Admin Vehicle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/vehicle')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @ApiSuccessResponse({
    summary: 'List vehicles',
    message: 'Vehicles fetched successfully',
    data: [],
    metaData: { total: 1, page: 1, limit: 10 },
    includeAuthErrors: true,
  })
  @Get()
  getAllVehicles(@Query() query: QueryVehicleDto) {
    return this.vehicleService.getAllVehicles(query);
  }

  @ApiSuccessResponse({
    summary: 'Get vehicle details',
    message: 'Vehicle fetched successfully',
    data: { id: 'vehicle_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':id')
  getVehicleById(@Param('id') id: string) {
    return this.vehicleService.getVehicleById(id);
  }

  @ApiSuccessResponse({
    summary: 'Get vehicle MOT history',
    message: 'Vehicle history fetched successfully',
    data: [],
    metaData: { total: 1, page: 1, limit: 10 },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':id/history')
  getVehicleHistory(
    @Param('id') vehicle_id: string,
    @Query() query: QueryVehicleHistoryDto,
  ) {
    return this.vehicleService.getVehicleHistory(vehicle_id, query);
  }
}

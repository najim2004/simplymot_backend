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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/vehicle')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  getAllVehicles(@Query() query: QueryVehicleDto) {
    return this.vehicleService.getAllVehicles(query);
  }

  @Get(':id')
  getVehicleById(@Param('id') id: string) {
    return this.vehicleService.getVehicleById(id);
  }

  @Get(':id/history')
  getVehicleHistory(
    @Param('id') vehicle_id: string,
    @Query() query: QueryVehicleHistoryDto,
  ) {
    return this.vehicleService.getVehicleHistory(vehicle_id, query);
  }
}

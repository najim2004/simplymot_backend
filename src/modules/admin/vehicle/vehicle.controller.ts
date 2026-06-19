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
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  AdminGetVehicleResponseDto,
  AdminListVehiclesResponseDto,
  AdminMotHistoryResponseDto,
} from './dto/swagger/vehicle-api.dto';

@ApiTags('Admin Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @apiTypedDoc(
    {
      summary: 'List vehicles',
      description: 'ADMIN + JWT.',
    },
    { type: AdminListVehiclesResponseDto },
  )
  @Get()
  getAllVehicles(@Query() query: QueryVehicleDto) {
    return this.vehicleService.getAllVehicles(query);
  }

  @apiTypedDoc(
    {
      summary: 'Get vehicle',
      description: 'ADMIN + JWT.',
    },
    { type: AdminGetVehicleResponseDto },
  )
  @Get(':vehicle_id')
  getVehicleById(@Param('vehicle_id') vehicle_id: string) {
    return this.vehicleService.getVehicleById(vehicle_id);
  }

  @apiTypedDoc(
    {
      summary: 'Get MOT history',
      description: 'ADMIN + JWT.',
    },
    { type: AdminMotHistoryResponseDto },
  )
  @Get(':vehicle_id/history')
  getVehicleHistory(
    @Param('vehicle_id') vehicle_id: string,
    @Query() query: QueryVehicleHistoryDto,
  ) {
    return this.vehicleService.getVehicleHistory(vehicle_id, query);
  }
}

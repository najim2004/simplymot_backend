import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { AddVehicleDto } from './dto/create-vehicle.dto';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { QueryMotHistoryDto } from './dto/query-vehicle.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  AddVehicleResponseDto,
  DeleteVehicleResponseDto,
  ListVehiclesResponseDto,
  MotHistoryResponseDto,
} from './dto/swagger/vehicle-api.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

@ApiTags('Vehicle')
@ApiBearerAuth()
@Controller('vehicle')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DRIVER)
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @apiTypedDoc(
    {
      summary: 'Add vehicle',
      description: 'JWT. Body: `registration_number`. Fetches DVLA/MOT data.',
    },
    { type: AddVehicleResponseDto },
  )
  @Post()
  addVehicle(
    @Body() addVehicleDto: AddVehicleDto,
    @User('id') user_id: string,
  ) {
    return this.vehicleService.addVehicle(addVehicleDto, user_id);
  }

  @apiTypedDoc(
    {
      summary: 'List my vehicles',
      description: 'JWT. User fleet with MOT status.',
    },
    { type: ListVehiclesResponseDto },
  )
  @Get()
  getAllVehicles(@User('id') user_id: string) {
    return this.vehicleService.getAllVehicles(user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Get MOT history',
      description: 'JWT. Paginated MOT history for owned vehicle.',
    },
    { type: MotHistoryResponseDto },
  )
  @Get(':vehicle_id/mot_history')
  getAllMothHistoryOfAVehicle(
    @Param('vehicle_id') vehicle_id: string,
    @Query() queryMotHistoryDto: QueryMotHistoryDto,
    @User('id') user_id: string,
  ) {
    return this.vehicleService.getAllMothHistoryOfAVehicle(
      vehicle_id,
      queryMotHistoryDto,
      user_id,
    );
  }

  @apiTypedDoc(
    {
      summary: 'Delete vehicle',
      description: 'JWT. Removes vehicle from fleet.',
    },
    { type: DeleteVehicleResponseDto },
  )
  @Delete(':vehicle_id')
  deleteVehicle(
    @Param('vehicle_id') vehicle_id: string,
    @User('id') user_id: string,
  ) {
    return this.vehicleService.deleteVehicle(vehicle_id, user_id);
  }
}

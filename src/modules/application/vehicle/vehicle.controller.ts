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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiTags('Vehicle')
@ApiBearerAuth()
@Controller('vehicle')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @ApiSuccessResponse({
    summary: 'Add vehicle',
    message: 'Vehicle added successfully',
    data: { id: 'vehicle_id', registration_number: 'AB12CDE' },
    includeAuthErrors: true,
  })
  @Post()
  addVehicle(
    @Body() addVehicleDto: AddVehicleDto,
    @User('id') user_id: string,
  ) {
    return this.vehicleService.addVehicle(addVehicleDto, user_id);
  }
  @ApiSuccessResponse({
    summary: 'List my vehicles',
    message: 'Vehicles fetched successfully',
    data: [],
    includeAuthErrors: true,
  })
  @Get()
  getAllVehicles(@User('id') user_id: string) {
    return this.vehicleService.getAllVehicles(user_id);
  }

  @ApiSuccessResponse({
    summary: 'Get vehicle MOT history',
    message: 'MOT history fetched successfully',
    data: [],
    metaData: { total: 1, page: 1, limit: 10 },
    includeAuthErrors: true,
    includeNotFound: true,
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
  @ApiSuccessResponse({
    summary: 'Delete vehicle',
    message: 'Vehicle deleted successfully',
    data: { id: 'vehicle_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Delete(':vehicle_id')
  deleteVehicle(
    @Param('vehicle_id') vehicle_id: string,
    @User('id') user_id: string,
  ) {
    return this.vehicleService.deleteVehicle(vehicle_id, user_id);
  }
}

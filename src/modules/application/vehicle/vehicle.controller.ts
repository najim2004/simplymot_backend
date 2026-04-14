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
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { QueryMotHistoryDto } from './dto/query-vehicle.dto';

@Controller('vehicle')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  addVehicle(
    @Body() addVehicleDto: AddVehicleDto,
    @User('id') user_id: string,
  ) {
    return this.vehicleService.addVehicle(addVehicleDto, user_id);
  }
  @Get()
  getAllVehicles(@User('id') user_id: string) {
    return this.vehicleService.getAllVehicles(user_id);
  }

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
  @Delete(':id')
  deleteVehicle(@Param('id') vehicle_id: string, @User('id') user_id: string) {
    return this.vehicleService.deleteVehicle(vehicle_id, user_id);
  }
}

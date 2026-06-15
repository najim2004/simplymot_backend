import { PartialType } from '@nestjs/swagger';
import { AddVehicleDto } from './create-vehicle.dto';

export class UpdateVehicleDto extends PartialType(AddVehicleDto) {}

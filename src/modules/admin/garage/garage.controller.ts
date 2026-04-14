import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GarageService } from './garage.service';
import { QueryGarageDto } from './dto/query-garage.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/garage')
export class GarageController {
  constructor(private readonly garageService: GarageService) {}

  @Get()
  getAllGarages(@Query() query: QueryGarageDto) {
    return this.garageService.getAllGarages(query);
  }

  @Get(':id')
  getGarageDetails(@Param('id') id: string) {
    return this.garageService.getGarageDetails(id);
  }
}

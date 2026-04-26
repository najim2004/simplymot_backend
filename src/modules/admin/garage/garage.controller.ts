import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { GarageService } from './garage.service';
import { QueryGarageDto } from './dto/query-garage.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiTags('Admin Garage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/garage')
export class GarageController {
  constructor(private readonly garageService: GarageService) {}

  @ApiSuccessResponse({
    summary: 'List garages',
    message: 'Garages fetched successfully',
    data: [],
    metaData: { total: 1, page: 1, limit: 10 },
    includeAuthErrors: true,
  })
  @Get()
  getAllGarages(@Query() query: QueryGarageDto) {
    return this.garageService.getAllGarages(query);
  }

  @ApiSuccessResponse({
    summary: 'Get garage details',
    message: 'Garage fetched successfully',
    data: { id: 'garage_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':id')
  getGarageDetails(@Param('id') id: string) {
    return this.garageService.getGarageDetails(id);
  }
}

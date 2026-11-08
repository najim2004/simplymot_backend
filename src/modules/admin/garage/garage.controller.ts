import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GarageService } from './garage.service';
import { QueryGarageDto } from './dto/query-garage.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  AdminGetGarageResponseDto,
  AdminListGaragesResponseDto,
} from './dto/swagger/garage-api.dto';

@ApiTags('Admin Garages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/garages')
export class GarageController {
  constructor(private readonly garageService: GarageService) {}

  @apiTypedDoc(
    {
      summary: 'List garages',
      description: 'ADMIN + JWT.',
    },
    { type: AdminListGaragesResponseDto },
  )
  @Get()
  getAllGarages(@Query() query: QueryGarageDto) {
    return this.garageService.getAllGarages(query);
  }

  @apiTypedDoc(
    {
      summary: 'Get garage',
      description: 'ADMIN + JWT.',
    },
    { type: AdminGetGarageResponseDto },
  )
  @Get(':garage_id')
  getGarageDetails(@Param('garage_id') garage_id: string) {
    return this.garageService.getGarageDetails(garage_id);
  }

  @Patch(':garage_id/visibility')
  toggleGarageVisibility(
    @Param('garage_id') garage_id: string,
    @Body('is_visible') is_visible?: boolean,
  ) {
    return this.garageService.toggleGarageVisibility(garage_id, is_visible);
  }
}

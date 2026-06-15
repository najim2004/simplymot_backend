import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { GarageService } from './garage.service';
import { QueryGarageDto } from './dto/query-garage.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

const GARAGE_LIST_ITEM = {
  id: 'clgarage001',
  garage_name: 'City MOT Centre',
  phone_number: '+441234567890',
  contact_email: 'contact@citymot.co.uk',
  vts_number: 'VTS12345',
  created_at: '2026-01-01T00:00:00.000Z',
  status: 'ACTIVE',
};

const GARAGE_DETAIL = {
  id: 'clgarage001',
  garage_name: 'City MOT Centre',
  phone_number: '+441234567890',
  contact_email: 'contact@citymot.co.uk',
  garage_image: 'https://cdn.example.com/storage/garages/cover.jpg',
  vts_number: 'VTS12345',
  created_at: '2026-01-01T00:00:00.000Z',
  address: '12 High Street, London',
  owner: {
    status: 'ACTIVE',
    name: 'Garage Owner',
    email: 'garage@example.com',
    phone_number: '+441234567890',
    avatar: null,
  },
};

@ApiTags('Admin Garages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/garages')
export class GarageController {
  constructor(private readonly garageService: GarageService) {}

  @ApiOperation({
    summary: 'List garages',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Garages fetched successfully',
    data: [GARAGE_LIST_ITEM],
    metaData: { total: 25, page: 1, limit: 10, pages: 3 },
  })
  @Get()
  getAllGarages(@Query() query: QueryGarageDto) {
    return this.garageService.getAllGarages(query);
  }

  @ApiOperation({
    summary: 'Get garage',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Garage fetched successfully',
    data: GARAGE_DETAIL,
  })
  @Get(':garage_id')
  getGarageDetails(@Param('garage_id') garage_id: string) {
    return this.garageService.getGarageDetails(garage_id);
  }
}

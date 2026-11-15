import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DriverService } from './driver.service';
import { QueryDriverDto } from './dto/query-driver.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller(['admin/driver', 'admin/drivers'])
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get()
  getAllDrivers(@Query() query: QueryDriverDto) {
    return this.driverService.getAllDrivers(query);
  }

  @Get(':driver_id')
  getDriverDetails(@Param('driver_id') driver_id: string) {
    return this.driverService.getDriverDetails(driver_id);
  }

  @Post(':driver_id/ban')
  banDriver(@Param('driver_id') driver_id: string) {
    return this.driverService.banDriver(driver_id);
  }

  @Post(':driver_id/unban')
  unbanDriver(@Param('driver_id') driver_id: string) {
    return this.driverService.unbanDriver(driver_id);
  }

  @Post(':driver_id/toggle-ban')
  toggleBanDriver(@Param('driver_id') driver_id: string) {
    return this.driverService.toggleBanDriver(driver_id);
  }
}


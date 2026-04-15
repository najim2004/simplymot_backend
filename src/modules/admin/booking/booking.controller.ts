import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { QueryBookingDto } from './dto/query-booking.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  getAllBookings(@Query() query: QueryBookingDto) {
    return this.bookingService.getAllBookings(query);
  }

  @Get(':id')
  getBookingDetails(@Param('id') id: string) {
    return this.bookingService.getBookingDetails(id);
  }
}

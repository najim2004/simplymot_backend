import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { QueryBookingDto } from './dto/query-booking.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiTags('Admin Booking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiSuccessResponse({
    summary: 'List bookings',
    message: 'Bookings fetched successfully',
    data: [],
    metaData: { total: 1, page: 1, limit: 10 },
    includeAuthErrors: true,
  })
  @Get()
  getAllBookings(@Query() query: QueryBookingDto) {
    return this.bookingService.getAllBookings(query);
  }

  @ApiSuccessResponse({
    summary: 'Get booking details',
    message: 'Booking fetched successfully',
    data: { id: 'booking_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':id')
  getBookingDetails(@Param('id') id: string) {
    return this.bookingService.getBookingDetails(id);
  }
}

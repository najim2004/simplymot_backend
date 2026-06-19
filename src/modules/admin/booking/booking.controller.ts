import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { QueryBookingDto } from './dto/query-booking.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  AdminGetBookingResponseDto,
  AdminListBookingsResponseDto,
} from './dto/swagger/booking-api.dto';

@ApiTags('Admin Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @apiTypedDoc(
    {
      summary: 'List bookings',
      description: 'ADMIN + JWT.',
    },
    { type: AdminListBookingsResponseDto },
  )
  @Get()
  getAllBookings(@Query() query: QueryBookingDto) {
    return this.bookingService.getAllBookings(query);
  }

  @apiTypedDoc(
    {
      summary: 'Get booking',
      description: 'ADMIN + JWT.',
    },
    { type: AdminGetBookingResponseDto },
  )
  @Get(':booking_id')
  getBookingDetails(@Param('booking_id') booking_id: string) {
    return this.bookingService.getBookingDetails(booking_id);
  }
}

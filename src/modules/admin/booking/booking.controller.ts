import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { QueryBookingDto } from './dto/query-booking.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

const BOOKING_LIST_ITEM = {
  id: 'clbooking001',
  order_date: '2026-06-20T09:00:00.000Z',
  status: 'CONFIRMED',
  total_amount: 45.0,
  customer: {
    name: 'John Driver',
    email: 'john@example.com',
    phone_number: '+441112223333',
  },
  vehicle: { registration_number: 'AB12CDE' },
  garage: { garage_name: 'City MOT Centre' },
};

@ApiTags('Admin Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiOperation({
    summary: 'List bookings',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Bookings fetched successfully',
    data: [BOOKING_LIST_ITEM],
    metaData: { total: 100, page: 1, limit: 10, pages: 10 },
  })
  @Get()
  getAllBookings(@Query() query: QueryBookingDto) {
    return this.bookingService.getAllBookings(query);
  }

  @ApiOperation({
    summary: 'Get booking',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Booking fetched successfully',
    data: {
      id: 'clbooking001',
      order_date: '2026-06-20T09:00:00.000Z',
      status: 'CONFIRMED',
      total_amount: 45.0,
      additional_services: [],
      customer: {
        name: 'John Driver',
        email: 'john@example.com',
        phone_number: '+441112223333',
        avatar: null,
      },
      vehicle: { registration_number: 'AB12CDE', make: 'FORD', model: 'FOCUS' },
      garage: {
        garage_name: 'City MOT Centre',
        owner: { name: 'Garage Owner', email: 'garage@example.com', avatar: null },
      },
      items: [
        {
          service: { title: 'MOT Test', type: 'MOT' },
          quantity: 1,
          unit_price: 45.0,
        },
      ],
    },
  })
  @Get(':booking_id')
  getBookingDetails(@Param('booking_id') booking_id: string) {
    return this.bookingService.getBookingDetails(booking_id);
  }
}

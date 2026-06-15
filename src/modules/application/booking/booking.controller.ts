import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import {
  CancelBookingDto,
  RescheduleBookingDto,
} from './dto/update-booking.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/modules/auth/decorators/get-user.decorator';

const BOOKING_CREATED = {
  id: 'clbooking001',
  garage_id: 'clgarage001',
  slot_id: 'clslot001',
  order_date: '2026-06-20T09:00:00.000Z',
  status: 'PENDING',
  additional_services: ['clsrv003'],
  created_at: '2026-06-14T10:00:00.000Z',
};

const BOOKING_LIST_ITEM = {
  id: 'clbooking001',
  status: 'CONFIRMED',
  starts_at: '2026-06-20T09:00:00.000Z',
  ends_at: '2026-06-20T10:00:00.000Z',
  service_price: 45.0,
  customer: {
    name: 'John Driver',
    email: 'john@example.com',
    phone_number: '+441112223333',
    avatar: 'https://cdn.example.com/avatars/john.jpg',
  },
  garage: {
    name: 'City MOT Centre',
    email: 'contact@citymot.co.uk',
    phone_number: '+441234567890',
    image: 'https://cdn.example.com/storage/garages/cover.jpg',
  },
  vehicle: {
    registration_number: 'AB12CDE',
    make: 'FORD',
    model: 'FOCUS',
  },
};

const BOOKING_LIST_META = {
  total: 15,
  page: 1,
  limit: 10,
  filters: {
    garage_id: null,
    from_date: null,
    to_date: null,
    status: null,
  },
};

const BOOKING_DETAIL = {
  id: 'clbooking001',
  created_at: '2026-06-14T10:00:00.000Z',
  updated_at: '2026-06-14T10:00:00.000Z',
  order_date: '2026-06-20T09:00:00.000Z',
  status: 'CONFIRMED',
  garage_id: 'clgarage001',
  customer_id: 'cluser001',
  vehicle_id: 'clvehicle001',
  slot_id: 'clslot001',
  total_amount: 45.0,
  additional_services: [],
  cancel_reason: null,
  cancelled_by: null,
  slot: {
    id: 'clslot001',
    starts_at: '2026-06-20T09:00:00.000Z',
    ends_at: '2026-06-20T10:00:00.000Z',
    status: 'BOOKED',
    description: null,
  },
  vehicle: {
    id: 'clvehicle001',
    registration_number: 'AB12CDE',
    make: 'FORD',
    model: 'FOCUS',
    last_mot_test_date: '2025-08-15T00:00:00.000Z',
    last_mot_expiry_date: '2026-08-15T00:00:00.000Z',
    last_mot_status: 'PASSED',
  },
  items: [
    {
      id: 'clitem001',
      quantity: 1,
      unit_price: 45.0,
      service: {
        id: 'clsrv001',
        title: 'MOT Test',
        type: 'MOT',
        price: 45.0,
      },
    },
  ],
  garage: {
    id: 'clgarage001',
    garage_name: 'City MOT Centre',
    garage_image: 'https://cdn.example.com/storage/garages/cover.jpg',
    contact_email: 'contact@citymot.co.uk',
    phone_number: '+441234567890',
    vts_number: 'VTS12345',
    address: '12 High Street, London',
    post_code: 'SW1A 1AA',
  },
};

const BOOKING_CANCELLED = {
  id: 'clbooking001',
  status: 'CANCELLED',
  cancel_reason: 'Schedule conflict',
  cancelled_by: 'DRIVER',
  updated_at: '2026-06-14T11:00:00.000Z',
};

const BOOKING_RESCHEDULED = {
  id: 'clbooking001',
  garage_id: 'clgarage001',
  slot_id: 'clslot005',
  order_date: '2026-06-21T10:00:00.000Z',
  status: 'CONFIRMED',
  updated_at: '2026-06-14T12:00:00.000Z',
};

@ApiTags('Booking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiOperation({
    summary: 'Create booking',
    description:
      'JWT (driver). Body: `garage_id`, `vehicle_id`, optional `slot_id` OR `start_time`+`end_time`. Garage needs active subscription.',
  })
  @ApiSuccessResponse({
    message: 'Booking created successfully',
    data: BOOKING_CREATED,
  })
  @Post()
  create(
    @Body() createBookingDto: CreateBookingDto,
    @User('id') user_id: string,
  ) {
    return this.bookingService.create(createBookingDto, user_id);
  }

  @ApiOperation({
    summary: 'List bookings',
    description:
      'JWT. Driver: own bookings. Garage: garage bookings. Filters: `status`, `garage_id`, `from_date`, `to_date`.',
  })
  @ApiSuccessResponse({
    message: 'Bookings fetched successfully',
    data: [BOOKING_LIST_ITEM],
    metaData: BOOKING_LIST_META,
  })
  @Get()
  findAllBookings(
    @Query() query: QueryBookingDto,
    @User('id') user_id: string,
  ) {
    return this.bookingService.findAll(user_id, query);
  }

  @ApiOperation({
    summary: 'Reschedule booking',
    description: 'GARAGE + JWT only. New `slot_id` or time range.',
  })
  @ApiSuccessResponse({
    message: 'Booking rescheduled successfully',
    data: BOOKING_RESCHEDULED,
  })
  @Patch(':booking_id/reschedule')
  reschedule(
    @Param('booking_id') booking_id: string,
    @Body() rescheduleBookingDto: RescheduleBookingDto,
    @User('id') user_id: string,
  ) {
    return this.bookingService.reschedule(
      user_id,
      booking_id,
      rescheduleBookingDto,
    );
  }

  @ApiOperation({
    summary: 'Cancel booking',
    description: 'JWT. Driver or garage. Body: `reason` required.',
  })
  @ApiSuccessResponse({
    message: 'Booking cancelled successfully',
    data: BOOKING_CANCELLED,
  })
  @Patch(':booking_id/cancel')
  cancel(
    @Param('booking_id') booking_id: string,
    @Body() cancelBookingDto: CancelBookingDto,
    @User('id') user_id: string,
  ) {
    return this.bookingService.cancel(user_id, booking_id, cancelBookingDto);
  }

  @ApiOperation({
    summary: 'Get booking',
    description: 'JWT. Driver view has garage; garage view has customer.',
  })
  @ApiSuccessResponse({
    message: 'Booking fetched successfully',
    data: BOOKING_DETAIL,
  })
  @Get(':booking_id')
  findOneBooking(
    @Param('booking_id') booking_id: string,
    @User('id') user_id: string,
  ) {
    return this.bookingService.findOne(user_id, booking_id);
  }
}

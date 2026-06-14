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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/modules/auth/decorators/get-user.decorator';

@ApiTags('Booking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiSuccessResponse({
    summary: 'Create booking',
    message: 'Booking created successfully',
    data: { id: 'booking_id' },
    includeAuthErrors: true,
  })
  @Post()
  create(
    @Body() createBookingDto: CreateBookingDto,
    @User('id') user_id: string,
  ) {
    return this.bookingService.create(createBookingDto, user_id);
  }

  @ApiSuccessResponse({
    summary: 'List bookings',
    message: 'Bookings fetched successfully',
    data: [],
    metaData: { total: 1, page: 1, limit: 10 },
    includeAuthErrors: true,
  })
  @Get()
  findAllBookings(
    @Query() query: QueryBookingDto,
    @User('id') user_id: string,
  ) {
    return this.bookingService.findAll(user_id, query);
  }

  @ApiSuccessResponse({
    summary: 'Reschedule booking',
    message: 'Booking rescheduled successfully',
    data: { id: 'booking_id' },
    includeAuthErrors: true,
    includeNotFound: true,
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

  @ApiSuccessResponse({
    summary: 'Cancel booking',
    message: 'Booking cancelled successfully',
    data: { id: 'booking_id', status: 'CANCELLED' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Patch(':booking_id/cancel')
  cancel(
    @Param('booking_id') booking_id: string,
    @Body() cancelBookingDto: CancelBookingDto,
    @User('id') user_id: string,
  ) {
    return this.bookingService.cancel(user_id, booking_id, cancelBookingDto);
  }

  @ApiSuccessResponse({
    summary: 'Get booking',
    message: 'Booking fetched successfully',
    data: { id: 'booking_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':booking_id')
  findOneBooking(
    @Param('booking_id') booking_id: string,
    @User('id') user_id: string,
  ) {
    return this.bookingService.findOne(user_id, booking_id);
  }
}

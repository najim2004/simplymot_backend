import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import {
  CancelBookingDto,
  RescheduleBookingDto,
  UpdateBookingNoteDto,
} from './dto/update-booking.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  CancelBookingResponseDto,
  CreateBookingResponseDto,
  GetBookingResponseDto,
  ListBookingsResponseDto,
  RescheduleBookingResponseDto,
} from './dto/swagger/booking-api.dto';

@ApiTags('Booking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @apiTypedDoc(
    {
      summary: 'Create booking',
      description:
        'JWT (driver). Body: `garage_id`, optional `slot_id` OR `start_time`+`end_time`, optional `additional_services`. Garage needs active subscription.',
    },
    { type: CreateBookingResponseDto, status: HttpStatus.CREATED },
  )
  @Post()
  create(
    @Body() createBookingDto: CreateBookingDto,
    @User('id') user_id: string,
  ) {
    return this.bookingService.create(createBookingDto, user_id);
  }

  @apiTypedDoc(
    {
      summary: 'List bookings',
      description:
        'JWT. Driver: own bookings. Garage: garage bookings. Filters: `status`, `garage_id`, `from_date`, `to_date`.',
    },
    { type: ListBookingsResponseDto },
  )
  @Get()
  findAllBookings(
    @Query() query: QueryBookingDto,
    @User('id') user_id: string,
  ) {
    return this.bookingService.findAll(user_id, query);
  }

  @apiTypedDoc(
    {
      summary: 'Reschedule booking',
      description: 'Driver or garage + JWT. New `slot_id` or time range.',
    },
    { type: RescheduleBookingResponseDto },
  )
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

  @apiTypedDoc(
    {
      summary: 'Update booking note',
      description: 'GARAGE + JWT only. Private note for garage operator.',
    },
    { type: Object },
  )
  @Patch(':booking_id/note')
  updateNote(
    @Param('booking_id') booking_id: string,
    @Body() updateBookingNoteDto: UpdateBookingNoteDto,
    @User('id') user_id: string,
  ) {
    return this.bookingService.updateNote(
      user_id,
      booking_id,
      updateBookingNoteDto,
    );
  }

  @apiTypedDoc(
    {
      summary: 'Cancel booking',
      description: 'JWT. Driver or garage. Body: `reason` required.',
    },
    { type: CancelBookingResponseDto },
  )
  @Patch(':booking_id/cancel')
  cancel(
    @Param('booking_id') booking_id: string,
    @Body() cancelBookingDto: CancelBookingDto,
    @User('id') user_id: string,
  ) {
    return this.bookingService.cancel(user_id, booking_id, cancelBookingDto);
  }

  @apiTypedDoc(
    {
      summary: 'Get booking',
      description: 'JWT. Driver view has garage; garage view has customer.',
    },
    { type: GetBookingResponseDto },
  )
  @Get(':booking_id')
  findOneBooking(
    @Param('booking_id') booking_id: string,
    @User('id') user_id: string,
  ) {
    return this.bookingService.findOne(user_id, booking_id);
  }
}

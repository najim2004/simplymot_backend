import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/modules/auth/decorators/get-user.decorator';

@ApiTags('Booking')
@ApiBearerAuth()
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiSuccessResponse({
    summary: 'Create booking',
    message: 'Booking created successfully',
    data: { id: 'booking_id' },
    includeAuthErrors: true,
  })
  @UseGuards(JwtAuthGuard)
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
  })
  @Get()
  findAll() {
    return this.bookingService.findAll();
  }

  @ApiSuccessResponse({
    summary: 'Get booking',
    message: 'Booking fetched successfully',
    data: { id: 'booking_id' },
    includeNotFound: true,
  })
  @Get(':bookings_id')
  findOne(@Param('bookings_id') bookings_id: string) {
    return this.bookingService.findOne(bookings_id);
  }

  @ApiSuccessResponse({
    summary: 'Update booking',
    message: 'Booking updated successfully',
    data: { id: 'booking_id' },
    includeNotFound: true,
  })
  @Patch(':bookings_id')
  update(
    @Param('bookings_id') bookings_id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingService.update(bookings_id, updateBookingDto);
  }

  @ApiSuccessResponse({
    summary: 'Delete booking',
    message: 'Booking deleted successfully',
    data: { id: 'booking_id' },
    includeNotFound: true,
  })
  @Delete(':bookings_id')
  remove(@Param('bookings_id') bookings_id: string) {
    return this.bookingService.remove(bookings_id);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiTags('Booking')
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiSuccessResponse({
    summary: 'Create booking',
    message: 'Booking created successfully',
    data: { id: 'booking_id' },
  })
  @Post()
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
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
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(+id);
  }

  @ApiSuccessResponse({
    summary: 'Update booking',
    message: 'Booking updated successfully',
    data: { id: 'booking_id' },
    includeNotFound: true,
  })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingService.update(+id, updateBookingDto);
  }

  @ApiSuccessResponse({
    summary: 'Delete booking',
    message: 'Booking deleted successfully',
    data: { id: 'booking_id' },
    includeNotFound: true,
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(+id);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryBookingDto } from './dto/query-booking.dto';
import { Prisma } from '@generated/prisma';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllBookings(query: QueryBookingDto) {
    const { search, from_date, to_date, page, limit, status, id } = query;
    const where: Prisma.BookingWhereInput = {
      ...(from_date && { order_date: { gte: from_date } }),
      ...(to_date && { order_date: { lte: to_date } }),
      ...(status && { status: status }),
      ...(id && { OR: [{ customer_id: id }, { garage_id: id }] }),
    };
    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        {
          customer: { phone_number: { contains: search, mode: 'insensitive' } },
        },
        {
          vehicle: {
            registration_number: { contains: search, mode: 'insensitive' },
          },
        },
        { garage: { garage_name: { contains: search, mode: 'insensitive' } } },
        {
          garage: { contact_email: { contains: search, mode: 'insensitive' } },
        },
        {
          garage: { phone_number: { contains: search, mode: 'insensitive' } },
        },
        {
          garage: { vts_number: { contains: search, mode: 'insensitive' } },
        },
        {
          garage: {
            owner: { name: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          garage: {
            owner: { email: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }
    const bookings = await this.prisma.booking.findMany({
      where,
      select: {
        id: true,
        order_date: true,
        status: true,
        total_amount: true,
        customer: {
          select: {
            name: true,
            email: true,
            phone_number: true,
          },
        },
        vehicle: {
          select: {
            registration_number: true,
          },
        },
        garage: {
          select: {
            garage_name: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    const total = await this.prisma.booking.count({ where });

    return ResponseHelper.success({
      data: bookings,
      message: 'Bookings fetched successfully',
      meta_data: {
        total,
        page,
        limit,
        search,
        filters: {
          from_date,
          to_date,
          status,
        },
      },
    });
  }

  async getBookingDetails(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        order_date: true,
        status: true,
        total_amount: true,
        customer: {
          select: {
            name: true,
            email: true,
            phone_number: true,
            avatar: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            registration_number: true,
            mot_expiry_date: true,
            is_expired: true,
            make: true,
            model: true,
            color: true,
            fuel_type: true,
            engine_capacity: true,
            co2_emissions: true,
            mot_status: true,
            year_of_manufacture: true,
            mot_last_checked_at: true,
            reminder_last_sent_at: true,
          },
        },
        garage: {
          select: {
            garage_name: true,
            garage_image: true,
            contact_email: true,
            phone_number: true,
            vts_number: true,
            address: true,
            post_code: true,
            owner: {
              select: {
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        additional_services: true,
        items: {
          select: {
            service: {
              select: {
                title: true,
                type: true,
              },
            },
            quantity: true,
            unit_price: true,
          },
        },
      },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return ResponseHelper.success({
      data: {
        ...booking,
        customer: {
          ...booking.customer,
          avatar: booking.customer.avatar
            ? SojebStorage.url(booking.customer.avatar)
            : null,
        },
        garage: {
          ...booking.garage,
          garage_image: booking.garage.garage_image
            ? SojebStorage.url(booking.garage.garage_image)
            : null,
          owner: {
            ...booking.garage.owner,
            avatar: booking.garage.owner.avatar
              ? SojebStorage.url(booking.garage.owner.avatar)
              : null,
          },
        },
      },
      message: 'Booking details fetched successfully',
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryBookingDto } from './dto/query-booking.dto';
import { BookingStatus, Prisma } from '@generated/prisma';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllBookings(query: QueryBookingDto) {
    const {
      search,
      from_date,
      to_date,
      page = 1,
      limit = 10,
      status,
      id,
    } = query;

    const fromDateFilter = from_date || (query as any).startdate;
    const toDateFilter = to_date || (query as any).enddate;

    const where: Prisma.BookingWhereInput = {
      ...(fromDateFilter && { order_date: { gte: fromDateFilter } }),
      ...(toDateFilter && { order_date: { lte: toDateFilter } }),
      ...(status && { status: status }),
      ...(id && { OR: [{ customer_id: id }, { garage_id: id }] }),
    };

    if (search) {
      where.OR = [
        { booking_number: { contains: search, mode: 'insensitive' } },
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
        {
          vehicle: {
            make: { contains: search, mode: 'insensitive' },
          },
        },
        {
          vehicle: {
            model: { contains: search, mode: 'insensitive' },
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
        booking_number: true,
        order_date: true,
        status: true,
        total_amount: true,
        cancel_reason: true,
        cancelled_by: true,
        customer: {
          select: {
            id: true,
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
            make: true,
            model: true,
            color: true,
          },
        },
        garage: {
          select: {
            id: true,
            garage_name: true,
            garage_image: true,
            contact_email: true,
            phone_number: true,
            address: true,
            city: true,
            post_code: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
                avatar: true,
                status: true,
              },
            },
          },
        },
        slot: {
          select: {
            id: true,
            starts_at: true,
            ends_at: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { order_date: 'desc' },
    });

    const total = await this.prisma.booking.count({ where });

    const formattedBookings = bookings.map((b) => ({
      ...b,
      customer: b.customer
        ? {
            ...b.customer,
            avatar: b.customer.avatar
              ? SojebStorage.url(b.customer.avatar)
              : null,
          }
        : null,
      garage: b.garage
        ? {
            ...b.garage,
            garage_image: b.garage.garage_image
              ? SojebStorage.url(b.garage.garage_image)
              : null,
            owner: b.garage.owner
              ? {
                  ...b.garage.owner,
                  avatar: b.garage.owner.avatar
                    ? SojebStorage.url(b.garage.owner.avatar)
                    : null,
                }
              : null,
          }
        : null,
    }));

    return ResponseHelper.success({
      data: formattedBookings,
      message: 'Bookings fetched successfully',
      meta_data: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        search,
        filters: {
          from_date: fromDateFilter,
          to_date: toDateFilter,
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
        booking_number: true,
        order_date: true,
        status: true,
        total_amount: true,
        cancel_reason: true,
        cancelled_by: true,
        customer: {
          select: {
            id: true,
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
            id: true,
            garage_name: true,
            garage_image: true,
            contact_email: true,
            phone_number: true,
            vts_number: true,
            address: true,
            city: true,
            post_code: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
                avatar: true,
                status: true,
              },
            },
          },
        },
        slot: {
          select: {
            id: true,
            starts_at: true,
            ends_at: true,
          },
        },
        additional_services: true,
        garage_note: true,
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
        customer: booking.customer
          ? {
              ...booking.customer,
              avatar: booking.customer.avatar
                ? SojebStorage.url(booking.customer.avatar)
                : null,
            }
          : null,
        garage: booking.garage
          ? {
              ...booking.garage,
              garage_image: booking.garage.garage_image
                ? SojebStorage.url(booking.garage.garage_image)
                : null,
              owner: booking.garage.owner
                ? {
                    ...booking.garage.owner,
                    avatar: booking.garage.owner.avatar
                      ? SojebStorage.url(booking.garage.owner.avatar)
                      : null,
                  }
                : null,
            }
          : null,
      },
      message: 'Booking details fetched successfully',
    });
  }

  async cancelBooking(id: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancel_reason: reason || 'Cancelled by admin',
        cancelled_by: 'ADMIN',
      },
    });
    return ResponseHelper.success({
      data: updated,
      message: 'Booking cancelled successfully',
    });
  }

  async updateBookingStatus(id: string, status: BookingStatus) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status },
    });
    return ResponseHelper.success({
      data: updated,
      message: `Booking status updated to ${status}`,
    });
  }
}

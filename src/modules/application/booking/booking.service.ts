import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, TimeSlotStatus } from 'prisma/generated/enums';
import { Prisma } from 'prisma/generated/client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SlotRepository } from 'src/common/repository/slot/slot.repository';
import { ResponseHelper } from 'src/common/helper/response.helper';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotRepository: SlotRepository,
  ) {}

  async create(createBookingDto: CreateBookingDto, user_id: string) {
    const garage = await this.prisma.garage.findUnique({
      where: { id: createBookingDto.garage_id },
      select: {
        id: true,
        schedule: { select: { id: true } },
      },
    });

    if (!garage) {
      throw new NotFoundException('Garage not found');
    }

    if (!garage.schedule) {
      throw new NotFoundException('Schedule not found');
    }

    let startsAt: Date;
    let endsAt: Date;
    let existingSlotId: string | null = null;

    if (createBookingDto.slot_id) {
      const slot = await this.prisma.timeSlot.findFirst({
        where: {
          id: createBookingDto.slot_id,
          garage_id: createBookingDto.garage_id,
        },
        select: {
          id: true,
          starts_at: true,
          ends_at: true,
          status: true,
          booking_id: true,
        },
      });

      if (!slot) {
        throw new NotFoundException('Slot not found for this garage');
      }

      if (slot.booking_id || slot.status === TimeSlotStatus.BOOKED) {
        throw new ConflictException('This slot has already been booked');
      }

      if (slot.status === TimeSlotStatus.BLOCKED) {
        throw new ConflictException('This slot is blocked by the garage');
      }

      if (slot.status !== TimeSlotStatus.AVAILABLE) {
        throw new BadRequestException('This slot is not available for booking');
      }

      if (slot.ends_at <= new Date()) {
        throw new BadRequestException('Cannot book a past slot');
      }

      startsAt = slot.starts_at;
      endsAt = slot.ends_at;
      existingSlotId = slot.id;
    } else {
      startsAt = createBookingDto.start_time!;
      endsAt = createBookingDto.end_time!;

      const slotsData = await this.slotRepository.getSlots(
        createBookingDto.garage_id,
        { date: startsAt },
      );

      if (slotsData.is_closed) {
        throw new BadRequestException(
          slotsData.is_holiday
            ? `Garage is closed for ${slotsData.holiday_name ?? 'holiday'}`
            : 'Garage is closed on this day',
        );
      }

      const matchedSlot = slotsData.slots.find(
        (slot) =>
          slot.bookable &&
          slot.starts_at.getTime() === startsAt.getTime() &&
          slot.ends_at.getTime() === endsAt.getTime(),
      );

      if (!matchedSlot) {
        throw new BadRequestException(
          'Selected slot is not available for booking',
        );
      }

      existingSlotId = matchedSlot.id ?? null;
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      let slotId: string;

      if (existingSlotId) {
        const updated = await tx.timeSlot.updateMany({
          where: {
            id: existingSlotId,
            garage_id: createBookingDto.garage_id,
            status: TimeSlotStatus.AVAILABLE,
            booking_id: null,
            ends_at: { gt: new Date() },
          },
          data: {
            status: TimeSlotStatus.BOOKED,
            customer_id: user_id,
          },
        });

        if (updated.count === 0) {
          throw new ConflictException(
            'This slot has just been booked by another user',
          );
        }

        slotId = existingSlotId;
      } else {
        try {
          const createdSlot = await tx.timeSlot.create({
            data: {
              garage_id: createBookingDto.garage_id,
              schedule_id: garage.schedule!.id,
              starts_at: startsAt,
              ends_at: endsAt,
              status: TimeSlotStatus.BOOKED,
              customer_id: user_id,
            },
            select: { id: true },
          });
          slotId = createdSlot.id;
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            const existingSlot = await tx.timeSlot.findUnique({
              where: {
                garage_id_starts_at: {
                  garage_id: createBookingDto.garage_id,
                  starts_at: startsAt,
                },
              },
              select: { id: true, status: true, booking_id: true },
            });

            if (
              !existingSlot ||
              existingSlot.booking_id ||
              existingSlot.status !== TimeSlotStatus.AVAILABLE
            ) {
              throw new ConflictException(
                'This slot has just been booked by another user',
              );
            }

            const updated = await tx.timeSlot.updateMany({
              where: {
                id: existingSlot.id,
                status: TimeSlotStatus.AVAILABLE,
                booking_id: null,
                ends_at: { gt: new Date() },
              },
              data: {
                status: TimeSlotStatus.BOOKED,
                customer_id: user_id,
              },
            });

            if (updated.count === 0) {
              throw new ConflictException(
                'This slot has just been booked by another user',
              );
            }

            slotId = existingSlot.id;
          } else {
            throw error;
          }
        }
      }

      const createdBooking = await tx.booking.create({
        data: {
          customer_id: user_id,
          garage_id: createBookingDto.garage_id,
          slot_id: slotId,
          order_date: startsAt,
          status: BookingStatus.PENDING,
          additional_services: createBookingDto.additional_services ?? null,
        },
        select: {
          id: true,
          garage_id: true,
          slot_id: true,
          order_date: true,
          status: true,
          additional_services: true,
          created_at: true,
        },
      });

      await tx.timeSlot.update({
        where: { id: slotId },
        data: { booking_id: createdBooking.id },
      });

      return createdBooking;
    });

    return ResponseHelper.success({
      message: 'Booking created successfully',
      data: booking,
    });
  }

  findAll() {
    return `This action returns all booking`;
  }

  findOne(bookings_id: string) {
    return `This action returns a #${bookings_id} booking`;
  }

  update(bookings_id: string, updateBookingDto: UpdateBookingDto) {
    return `This action updates a #${bookings_id} booking`;
  }

  remove(bookings_id: string) {
    return `This action removes a #${bookings_id} booking`;
  }
}

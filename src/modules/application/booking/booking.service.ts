import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  TimeSlotStatus,
  UserKind,
  AuditAction,
  DayOfWeek,
} from '@generated/prisma/enums';
import { Prisma } from '@generated/prisma';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import {
  CancelBookingDto,
  RescheduleBookingDto,
} from './dto/update-booking.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SlotRepository } from 'src/common/repository/slot/slot.repository';
import { SubscriptionRepository } from 'src/common/repository/subscription/subscription.repository';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotRepository: SlotRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async create(createBookingDto: CreateBookingDto, user_id: string) {
    const garage = await this.prisma.garage.findUnique({
      where: { id: createBookingDto.garage_id },
      select: {
        id: true,
        owner_id: true,
        schedule: { select: { id: true } },
      },
    });

    if (!garage) {
      throw new NotFoundException('Garage not found');
    }

    const hasActiveSubscription =
      await this.subscriptionRepository.hasActiveSubscriptionAccess(
        garage.owner_id,
      );

    if (!hasActiveSubscription) {
      throw new BadRequestException(
        'This garage is not accepting bookings at the moment',
      );
    }

    if (!garage.schedule) {
      await this.prisma.schedule.create({
        data: {
          garage_id: garage.id,
          schedule_intervals: {
            create: [
              DayOfWeek.MONDAY,
              DayOfWeek.TUESDAY,
              DayOfWeek.WEDNESDAY,
              DayOfWeek.THURSDAY,
              DayOfWeek.FRIDAY,
              DayOfWeek.SATURDAY,
              DayOfWeek.SUNDAY,
            ].map((day) => ({
              day_of_week: day,
              is_closed: day === DayOfWeek.SUNDAY,
              slot_duration: 60,
              buffer_time: 0,
              open_time:
                day === DayOfWeek.SUNDAY
                  ? null
                  : new Date('1970-01-01T09:00:00.000Z'),
              close_time:
                day === DayOfWeek.SUNDAY
                  ? null
                  : new Date('1970-01-01T17:00:00.000Z'),
              break_times:
                day === DayOfWeek.SUNDAY
                  ? undefined
                  : {
                      create: [
                        {
                          start_time: new Date('1970-01-01T13:00:00.000Z'),
                          end_time: new Date('1970-01-01T14:00:00.000Z'),
                          description: 'Lunch Break',
                        },
                      ],
                    },
            })),
          },
        },
      });
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
      startsAt = createBookingDto.starts_at!;
      endsAt = createBookingDto.ends_at!;

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

      await tx.auditLog.create({
        data: {
          table_name: 'Booking',
          record_id: createdBooking.id,
          action: AuditAction.CREATE,
          actor_id: user_id,
          actor_type: 'user',
          garage_id: createBookingDto.garage_id,
          new_values: createdBooking as any,
          metadata: {
            created_by: 'DRIVER',
          },
        },
      });

      return createdBooking;
    });

    return ResponseHelper.success({
      message: 'Booking created successfully',
      data: booking,
    });
  }

  async findAll(user_id: string, query: QueryBookingDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, kind: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
    const where: Prisma.BookingWhereInput = {};

    if (user.kind === UserKind.GARAGE) {
      let garageId: string;

      if (query.garage_id) {
        const garage = await this.prisma.garage.findFirst({
          where: { id: query.garage_id, owner_id: user.id },
          select: { id: true },
        });

        if (!garage) {
          throw new NotFoundException('Garage not found');
        }

        garageId = garage.id;
      } else {
        const garage = await this.prisma.garage.findFirst({
          where: { owner_id: user.id },
          orderBy: { created_at: 'desc' },
          select: { id: true },
        });

        if (!garage) {
          throw new NotFoundException('Garage not found');
        }

        garageId = garage.id;
      }

      where.garage_id = garageId;
    } else {
      where.customer_id = user.id;
      if (query.garage_id) {
        where.garage_id = query.garage_id;
      }
    }

    if (query.from_date || query.to_date) {
      where.order_date = {
        ...(query.from_date && { gte: query.from_date }),
        ...(query.to_date && { lte: query.to_date }),
      };
    }

    if (query.status) {
      where.status = query.status;
    }

    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        select: {
          id: true,
          status: true,
          order_date: true,
          slot: {
            select: {
              starts_at: true,
              ends_at: true,
            },
          },
          items: {
            take: 1,
            select: {
              unit_price: true,
            },
          },
          vehicle: {
            select: {
              registration_number: true,
              make: true,
              model: true,
            },
          },
          garage: {
            select: {
              garage_name: true,
              contact_email: true,
              phone_number: true,
              garage_image: true,
            },
          },
          customer: {
            select: {
              name: true,
              email: true,
              phone_number: true,
              avatar: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    const bookings = rows.map((booking) => ({
      id: booking.id,
      status: booking.status,
      starts_at: booking.slot?.starts_at ?? booking.order_date,
      ends_at: booking.slot?.ends_at ?? null,
      service_price: booking.items[0]?.unit_price ?? null,
      customer: booking.customer
        ? {
            name: booking.customer.name,
            email: booking.customer.email,
            phone_number: booking.customer.phone_number,
            avatar: booking.customer.avatar
              ? SojebStorage.url(booking.customer.avatar)
              : null,
          }
        : null,
      garage: booking.garage
        ? {
            name: booking.garage.garage_name,
            email: booking.garage.contact_email,
            phone_number: booking.garage.phone_number,
            image: booking.garage.garage_image
              ? SojebStorage.url(booking.garage.garage_image)
              : null,
          }
        : null,
      vehicle: booking.vehicle
        ? {
            registration_number: booking.vehicle.registration_number,
            make: booking.vehicle.make,
            model: booking.vehicle.model,
          }
        : null,
    }));

    return ResponseHelper.success({
      message: 'Bookings fetched successfully',
      data: bookings,
      meta_data: {
        total,
        page,
        limit,
        filters: {
          garage_id: query.garage_id ?? null,
          from_date: query.from_date ?? null,
          to_date: query.to_date ?? null,
          status: query.status ?? null,
        },
      },
    });
  }

  async findOne(user_id: string, booking_id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, kind: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: booking_id },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        order_date: true,
        status: true,
        garage_id: true,
        customer_id: true,
        vehicle_id: true,
        slot_id: true,
        total_amount: true,
        additional_services: true,
        cancel_reason: true,
        cancelled_by: true,
        slot: {
          select: {
            id: true,
            starts_at: true,
            ends_at: true,
            status: true,
            description: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            registration_number: true,
            make: true,
            model: true,
            color: true,
            fuel_type: true,
            engine_capacity: true,
            co2_emissions: true,
            mot_status: true,
            is_expired: true,
            mot_expiry_date: true,
            mot_last_checked_at: true,
            year_of_manufacture: true,
            mot_history: {
              orderBy: { test_date: 'desc' },
              take: 1,
              select: {
                test_date: true,
                expiry_date: true,
                status: true,
              },
            },
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
            country: true,
            state: true,
            city: true,
            address: true,
            post_code: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            avatar: true,
            country: true,
            state: true,
            city: true,
            address: true,
            post_code: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            unit_price: true,
            service: {
              select: {
                id: true,
                title: true,
                type: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (user.kind === UserKind.GARAGE) {
      if (!booking.garage_id) {
        throw new ForbiddenException('You do not have access to this booking');
      }

      const ownedGarage = await this.prisma.garage.findFirst({
        where: { id: booking.garage_id, owner_id: user.id },
        select: { id: true },
      });

      if (!ownedGarage) {
        throw new ForbiddenException('You do not have access to this booking');
      }
    } else if (booking.customer_id !== user.id) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    const lastMot = booking.vehicle?.mot_history?.[0] ?? null;
    const vehicle = booking.vehicle
      ? {
          ...booking.vehicle,
          mot_history: undefined,
          last_mot_test_date: lastMot?.test_date ?? null,
          last_mot_expiry_date: lastMot?.expiry_date ?? null,
          last_mot_status: lastMot?.status ?? null,
        }
      : null;

    const baseBooking = {
      id: booking.id,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      order_date: booking.order_date,
      status: booking.status,
      garage_id: booking.garage_id,
      customer_id: booking.customer_id,
      vehicle_id: booking.vehicle_id,
      slot_id: booking.slot_id,
      total_amount: booking.total_amount,
      additional_services: booking.additional_services,
      cancel_reason: booking.cancel_reason,
      cancelled_by: booking.cancelled_by,
      slot: booking.slot,
      vehicle,
      items: booking.items,
    };

    if (user.kind === UserKind.GARAGE) {
      return ResponseHelper.success({
        message: 'Booking fetched successfully',
        data: {
          ...baseBooking,
          customer: booking.customer
            ? {
                ...booking.customer,
                avatar: booking.customer.avatar
                  ? SojebStorage.url(booking.customer.avatar)
                  : null,
              }
            : null,
        },
      });
    }

    return ResponseHelper.success({
      message: 'Booking fetched successfully',
      data: {
        ...baseBooking,
        garage: booking.garage
          ? {
              ...booking.garage,
              garage_image: booking.garage.garage_image
                ? SojebStorage.url(booking.garage.garage_image)
                : null,
            }
          : null,
      },
    });
  }

  async reschedule(
    user_id: string,
    booking_id: string,
    rescheduleBookingDto: RescheduleBookingDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, kind: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.kind !== UserKind.GARAGE) {
      throw new ForbiddenException('Only garage users can reschedule bookings');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: booking_id },
      select: {
        id: true,
        status: true,
        customer_id: true,
        garage_id: true,
        slot_id: true,
        garage: {
          select: {
            id: true,
            owner_id: true,
            schedule: { select: { id: true } },
          },
        },
        slot: {
          select: {
            id: true,
            ends_at: true,
          },
        },
      },
    });

    if (!booking || !booking.garage_id) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.garage?.owner_id !== user_id) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot reschedule a ${booking.status.toLowerCase()} booking`,
      );
    }

    if (!booking.garage?.schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (!booking.customer_id) {
      throw new BadRequestException('Booking customer is missing');
    }

    let startsAt: Date;
    let endsAt: Date;
    let existingSlotId: string | null = null;

    if (rescheduleBookingDto.slot_id) {
      const slot = await this.prisma.timeSlot.findFirst({
        where: {
          id: rescheduleBookingDto.slot_id,
          garage_id: booking.garage_id,
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
      startsAt = rescheduleBookingDto.start_time!;
      endsAt = rescheduleBookingDto.end_time!;

      const slotsData = await this.slotRepository.getSlots(booking.garage_id, {
        date: startsAt,
      });

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

    const updatedBooking = await this.prisma.$transaction(async (tx) => {
      let newSlotId: string;

      if (existingSlotId) {
        const updated = await tx.timeSlot.updateMany({
          where: {
            id: existingSlotId,
            garage_id: booking.garage_id!,
            status: TimeSlotStatus.AVAILABLE,
            booking_id: null,
            ends_at: { gt: new Date() },
          },
          data: {
            status: TimeSlotStatus.BOOKED,
            customer_id: booking.customer_id!,
          },
        });

        if (updated.count === 0) {
          throw new ConflictException(
            'This slot has just been booked by another user',
          );
        }

        newSlotId = existingSlotId;
      } else {
        try {
          const createdSlot = await tx.timeSlot.create({
            data: {
              garage_id: booking.garage_id!,
              schedule_id: booking.garage!.schedule!.id,
              starts_at: startsAt,
              ends_at: endsAt,
              status: TimeSlotStatus.BOOKED,
              customer_id: booking.customer_id!,
            },
            select: { id: true },
          });
          newSlotId = createdSlot.id;
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            const existingSlot = await tx.timeSlot.findUnique({
              where: {
                garage_id_starts_at: {
                  garage_id: booking.garage_id!,
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
                customer_id: booking.customer_id!,
              },
            });

            if (updated.count === 0) {
              throw new ConflictException(
                'This slot has just been booked by another user',
              );
            }

            newSlotId = existingSlot.id;
          } else {
            throw error;
          }
        }
      }

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          slot_id: newSlotId,
          order_date: startsAt,
        },
        select: {
          id: true,
          garage_id: true,
          slot_id: true,
          order_date: true,
          status: true,
          updated_at: true,
        },
      });

      await tx.timeSlot.update({
        where: { id: newSlotId },
        data: { booking_id: updated.id },
      });

      if (booking.slot_id && booking.slot_id !== newSlotId) {
        if (booking.slot?.ends_at && booking.slot.ends_at <= new Date()) {
          await tx.timeSlot.delete({ where: { id: booking.slot_id } });
        } else {
          await tx.timeSlot.update({
            where: { id: booking.slot_id },
            data: {
              status: TimeSlotStatus.AVAILABLE,
              booking_id: null,
              customer_id: null,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          table_name: 'Booking',
          record_id: booking.id,
          action: AuditAction.UPDATE,
          actor_id: user_id,
          actor_type: 'user',
          garage_id: booking.garage_id,
          old_values: {
            slot_id: booking.slot_id,
            order_date: booking.slot?.ends_at,
          },
          new_values: {
            slot_id: newSlotId,
            order_date: startsAt,
          },
          metadata: {
            rescheduled_by: 'GARAGE',
            reason: rescheduleBookingDto.reason ?? null,
          },
        },
      });

      return updated;
    });

    return ResponseHelper.success({
      message: 'Booking rescheduled successfully',
      data: updatedBooking,
    });
  }

  async cancel(
    user_id: string,
    booking_id: string,
    cancelBookingDto: CancelBookingDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, kind: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: booking_id },
      select: {
        id: true,
        status: true,
        customer_id: true,
        garage_id: true,
        slot_id: true,
        garage: {
          select: {
            owner_id: true,
          },
        },
        slot: {
          select: {
            id: true,
            ends_at: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const isGarageOwner =
      user.kind === UserKind.GARAGE && booking.garage?.owner_id === user_id;
    const isCustomer = booking.customer_id === user_id;

    if (!isGarageOwner && !isCustomer) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot cancel a ${booking.status.toLowerCase()} booking`,
      );
    }

    const cancelledBy = isGarageOwner ? 'GARAGE' : 'DRIVER';

    const updatedBooking = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          cancel_reason: cancelBookingDto.reason,
          cancelled_by: cancelledBy,
          slot_id: null,
        },
        select: {
          id: true,
          status: true,
          cancel_reason: true,
          cancelled_by: true,
          updated_at: true,
        },
      });

      if (booking.slot_id) {
        if (booking.slot?.ends_at && booking.slot.ends_at <= new Date()) {
          await tx.timeSlot.delete({ where: { id: booking.slot_id } });
        } else {
          await tx.timeSlot.update({
            where: { id: booking.slot_id },
            data: {
              status: TimeSlotStatus.AVAILABLE,
              booking_id: null,
              customer_id: null,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          table_name: 'Booking',
          record_id: booking.id,
          action: AuditAction.CANCELLATION,
          actor_id: user_id,
          actor_type: 'user',
          garage_id: booking.garage_id,
          old_values: {
            status: booking.status,
            cancel_reason: null,
            cancelled_by: null,
          },
          new_values: {
            status: BookingStatus.CANCELLED,
            cancel_reason: cancelBookingDto.reason,
            cancelled_by: cancelledBy,
          },
          metadata: {
            cancelled_by: cancelledBy,
            reason: cancelBookingDto.reason,
          },
        },
      });

      return updated;
    });

    return ResponseHelper.success({
      message: 'Booking cancelled successfully',
      data: updatedBooking,
    });
  }
}

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
  UpdateBookingNoteDto,
} from './dto/update-booking.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SlotRepository } from 'src/common/repository/slot/slot.repository';
import { SubscriptionRepository } from 'src/common/repository/subscription/subscription.repository';
import { VehicleRepository } from 'src/common/repository/vehicle/vehicle.repository';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotRepository: SlotRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  private async generateBookingNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const PREFIX = 'SM';
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const prefixWithDate = `${PREFIX}-${dateStr}-`;
    const countToday = await tx.booking.count({
      where: {
        booking_number: {
          startsWith: prefixWithDate,
        },
      },
    });

    let sequence = countToday + 1;
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = `${prefixWithDate}${String(sequence).padStart(4, '0')}`;
      const exists = await tx.booking.findUnique({
        where: { booking_number: candidate },
        select: { id: true },
      });

      if (!exists) {
        return candidate;
      }

      sequence += 1;
    }

    return `${prefixWithDate}${String(Date.now()).slice(-4)}`;
  }

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

    // ── Resolve vehicle ────────────────────────────────────────────────────
    let resolvedVehicleId: string | null = null;

    if (createBookingDto.vehicle_id) {
      // vehicle_id provided → validate that it belongs to the booking user
      const vehicle = await this.prisma.vehicle.findFirst({
        where: {
          id: createBookingDto.vehicle_id,
          user_id: user_id,
        },
        select: { id: true },
      });

      if (!vehicle) {
        throw new NotFoundException(
          'Vehicle not found or does not belong to the current user',
        );
      }

      resolvedVehicleId = vehicle.id;
    } else if (createBookingDto.vehicle_registration_number) {
      // registration number provided → find-or-create, same logic as VehicleService.addVehicle
      const normalized = createBookingDto.vehicle_registration_number
        .replace(/\s/g, '')
        .toUpperCase();

      const existingVehicle = await this.prisma.vehicle.findFirst({
        where: { registration_number: normalized },
        select: { id: true, user_id: true, mot_last_checked_at: true },
      });

      if (existingVehicle) {
        if (existingVehicle.user_id && existingVehicle.user_id !== user_id) {
          throw new ConflictException(
            `This vehicle (${normalized}) is already registered to another user account.`,
          );
        } else if (!existingVehicle.user_id) {
          // Unowned vehicle — claim it for the current user
          const updated = await this.prisma.vehicle.update({
            where: { id: existingVehicle.id },
            data: { user_id: user_id },
          });
          if (
            this.vehicleRepository.shouldRefreshMotData(
              existingVehicle.mot_last_checked_at,
            )
          ) {
            await this.vehicleRepository
              .refreshVehicleDataFromDvla(updated)
              .catch(() => {
                /* best-effort, don't block booking */
              });
          }
          resolvedVehicleId = updated.id;
        } else {
          // existingVehicle.user_id === user_id  → already owned
          resolvedVehicleId = existingVehicle.id;
        }
      } else {
        // Vehicle not in DB → create it and fetch DVLA data
        const newVehicle = await this.prisma.vehicle.create({
          data: {
            registration_number: normalized,
            user_id: user_id,
          },
        });
        await this.vehicleRepository
          .refreshVehicleDataFromDvla(newVehicle)
          .catch(async () => {
            // If DVLA fetch fails, still keep the vehicle (don't delete) — booking should proceed
          });
      }
    }

    if (!resolvedVehicleId) {
      throw new BadRequestException('Vehicle not found');
    }
    // ── End vehicle resolution ─────────────────────────────────────────────

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

      // Human-readable, memorable booking number (e.g. SM-000123),
      // generated from the sequential booking count at creation time.
      const booking_number = await this.generateBookingNumber(tx);

      const createdBooking = await tx.booking.create({
        data: {
          customer_id: user_id,
          garage_id: createBookingDto.garage_id,
          vehicle_id: resolvedVehicleId,
          slot_id: slotId,
          order_date: startsAt,
          status: BookingStatus.BOOKED,
          booking_number,
          additional_services: createBookingDto.additional_services ?? null,
        },
        select: {
          id: true,
          booking_number: true,
          status: true,
          slot_id: true,
          order_date: true,
          additional_services: true,
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
          new_values: {
            id: createdBooking.id,
            status: createdBooking.status,
            slot_id: createdBooking.slot_id,
            order_date: createdBooking.order_date,
            slot_starts_at: startsAt,
            slot_ends_at: endsAt,
            additional_services: createdBooking.additional_services,
          },
          metadata: {
            created_by: 'DRIVER',
          },
        },
      });

      return createdBooking.id;
    });

    // Fetch only the data the frontend needs for the success modal
    const bookingData = await this.prisma.booking.findUnique({
      where: { id: booking },
      select: {
        id: true,
        booking_number: true,
        additional_services: true,
        garage: {
          select: {
            garage_name: true,
            address: true,
            post_code: true,
            contact_email: true,
            phone_number: true,
          },
        },
        slot: {
          select: {
            starts_at: true,
            ends_at: true,
          },
        },
        vehicle: {
          select: {
            registration_number: true,
          },
        },
      },
    });

    const garageAddress = [
      bookingData?.garage?.address,
      bookingData?.garage?.post_code,
    ]
      .filter(Boolean)
      .join(', ');

    return ResponseHelper.success({
      message: 'Booking created successfully',
      data: {
        id: bookingData?.id,
        booking_number: bookingData?.booking_number ?? null,
        order_id: bookingData?.id,
        additional_services: bookingData?.additional_services,
        garage: {
          garage_name: bookingData?.garage?.garage_name,
          address: garageAddress || null,
          email: bookingData?.garage?.contact_email,
          phone_number: bookingData?.garage?.phone_number,
        },
        slot: {
          starts_at: bookingData?.slot?.starts_at,
          ends_at: bookingData?.slot?.ends_at,
        },
        vehicle: {
          registration_number: bookingData?.vehicle?.registration_number,
        },
      },
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

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { customer: { name: { contains: term, mode: 'insensitive' } } },
        { customer: { email: { contains: term, mode: 'insensitive' } } },
        { customer: { phone_number: { contains: term, mode: 'insensitive' } } },
        {
          vehicle: {
            registration_number: { contains: term, mode: 'insensitive' },
          },
        },
        { vehicle: { make: { contains: term, mode: 'insensitive' } } },
        { vehicle: { model: { contains: term, mode: 'insensitive' } } },
        { garage: { garage_name: { contains: term, mode: 'insensitive' } } },
        { garage: { contact_email: { contains: term, mode: 'insensitive' } } },
        { garage: { phone_number: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        select: {
          id: true,
          booking_number: true,
          status: true,
          order_date: true,
          slot: {
            select: {
              starts_at: true,
              ends_at: true,
            },
          },
          vehicle: {
            select: {
              registration_number: true,
              make: true,
              model: true,
            },
          },
          garage_id: true,
          garage: {
            select: {
              id: true,
              garage_name: true,
              contact_email: true,
              phone_number: true,
              address: true,
              post_code: true,
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

    const isGarage = user.kind === UserKind.GARAGE;

    const bookings = rows.map((booking) => ({
      id: booking.id,
      booking_number: booking.booking_number,
      status: booking.status,
      starts_at: booking.slot?.starts_at ?? booking.order_date,
      ends_at: booking.slot?.ends_at ?? null,
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
      garage_id: booking.garage_id,
      garage: isGarage
        ? null
        : booking.garage
          ? {
              id: booking.garage.id,
              name: booking.garage.garage_name,
              email: booking.garage.contact_email,
              phone_number: booking.garage.phone_number,
              address: booking.garage.address,
              post_code: booking.garage.post_code,
              garage_image: booking.garage.garage_image
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
          search: query.search ?? null,
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
        booking_number: true,
        created_at: true,
        order_date: true,
        status: true,
        garage_id: true,
        customer_id: true,
        vehicle_id: true,
        slot_id: true,
        additional_services: true,
        garage_note: true,
        cancel_reason: true,
        cancelled_by: true,
        slot: {
          select: {
            id: true,
            starts_at: true,
            ends_at: true,
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

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        table_name: 'Booking',
        record_id: booking.id,
      },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        action: true,
        actor_type: true,
        created_at: true,
        old_values: true,
        new_values: true,
      },
    });

    const logs = auditLogs.map((log) => {
      const newVals = (log.new_values as Record<string, any>) || {};
      const oldVals = (log.old_values as Record<string, any>) || {};
      return {
        id: log.id,
        action: log.action,
        actor_type: log.actor_type,
        created_at: log.created_at,
        details: {
          status: newVals.status || null,
          slot_starts_at: newVals.slot_starts_at || null,
          slot_ends_at: newVals.slot_ends_at || null,
          previous_slot_starts_at: oldVals.slot_starts_at || null,
          previous_slot_ends_at: oldVals.slot_ends_at || null,
          cancel_reason: newVals.cancel_reason || null,
          cancelled_by: newVals.cancelled_by || null,
        },
      };
    });

    const baseBooking = {
      id: booking.id,
      booking_number: booking.booking_number,
      created_at: booking.created_at,
      order_date: booking.order_date,
      starts_at: booking.slot?.starts_at ?? null,
      ends_at: booking.slot?.ends_at ?? null,
      status: booking.status,
      garage_id: booking.garage_id,
      customer_id: booking.customer_id,
      slot_id: booking.slot_id,
      vehicle_id: booking.vehicle_id,
      additional_services: booking.additional_services,
      garage_note: booking.garage_note,
      cancel_reason: booking.cancel_reason,
      cancelled_by: booking.cancelled_by,
      logs,
    };

    const garageData = booking.garage
      ? {
          id: booking.garage.id,
          name: booking.garage.garage_name,
          email: booking.garage.contact_email,
          phone_number: booking.garage.phone_number,
          address: booking.garage.address,
          post_code: booking.garage.post_code,
          garage_image: booking.garage.garage_image
            ? SojebStorage.url(booking.garage.garage_image)
            : null,
        }
      : null;

    const vehicle = booking.vehicle
      ? {
          registration_number: booking.vehicle.registration_number,
          make: booking.vehicle.make,
          model: booking.vehicle.model,
          color: booking.vehicle.color,
          fuel_type: booking.vehicle.fuel_type,
          engine_capacity: booking.vehicle.engine_capacity,
          year_of_manufacture: booking.vehicle.year_of_manufacture,
          mot_status: booking.vehicle.mot_status,
          mot_expiry_date: booking.vehicle.mot_expiry_date,
          last_mot_test_date:
            booking.vehicle?.mot_history?.[0]?.test_date ?? null,
          last_mot_expiry_date:
            booking.vehicle?.mot_history?.[0]?.expiry_date ?? null,
          last_mot_status: booking.vehicle?.mot_history?.[0]?.status ?? null,
        }
      : null;

    if (user.kind === UserKind.GARAGE) {
      let meritScore = 100;

      if (booking.customer_id) {
        const [completedCount, customerCancelledCount] = await Promise.all([
          this.prisma.booking.count({
            where: {
              customer_id: booking.customer_id,
              status: BookingStatus.COMPLETED,
            },
          }),
          this.prisma.booking.count({
            where: {
              customer_id: booking.customer_id,
              status: BookingStatus.CANCELLED,
              cancelled_by: 'DRIVER',
            },
          }),
        ]);

        if (customerCancelledCount > 0) {
          meritScore = Math.max(
            10,
            Math.min(
              100,
              Math.round(
                ((completedCount + 2) /
                  (completedCount + customerCancelledCount + 2)) *
                  100,
              ),
            ),
          );
        } else {
          meritScore = 100;
        }
      }

      return ResponseHelper.success({
        message: 'Booking fetched successfully',
        data: {
          ...baseBooking,
          total_amount: undefined,
          items: undefined,
          vehicle,
          garage: garageData,
          customer: booking.customer
            ? {
                id: booking.customer.id,
                name: booking.customer.name,
                email: booking.customer.email,
                phone_number: booking.customer.phone_number,
                avatar: booking.customer.avatar
                  ? SojebStorage.url(booking.customer.avatar)
                  : null,
                merit_score: meritScore,
              }
            : null,
        },
      });
    }

    return ResponseHelper.success({
      message: 'Booking fetched successfully',
      data: {
        ...baseBooking,
        garage_note: undefined,
        customer: undefined,
        garage: garageData,
        vehicle,
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

    const booking = await this.prisma.booking.findUnique({
      where: { id: booking_id },
      select: {
        id: true,
        status: true,
        order_date: true,
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
            starts_at: true,
            ends_at: true,
          },
        },
      },
    });

    if (!booking || !booking.garage_id) {
      throw new NotFoundException('Booking not found');
    }

    const isGarageOwner = booking.garage?.owner_id === user_id;
    const isCustomer = booking.customer_id === user_id;

    if (!isGarageOwner && !isCustomer) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    const rescheduledBy = isGarageOwner ? 'GARAGE' : 'DRIVER';

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

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          slot_id: newSlotId,
          order_date: startsAt,
          status: BookingStatus.RESCHEDULED,
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

      const wasPastSlotDeleted = Boolean(
        booking.slot_id &&
          booking.slot_id !== newSlotId &&
          booking.slot?.ends_at &&
          booking.slot.ends_at <= new Date(),
      );

      await tx.auditLog.create({
        data: {
          table_name: 'Booking',
          record_id: booking.id,
          action: AuditAction.UPDATE,
          actor_id: user_id,
          actor_type: isGarageOwner ? 'garage' : 'user',
          garage_id: booking.garage_id,
          old_values: {
            status: booking.status,
            slot_id: booking.slot_id,
            order_date: booking.order_date,
            slot_starts_at: booking.slot?.starts_at,
            slot_ends_at: booking.slot?.ends_at,
          },
          new_values: {
            status: BookingStatus.RESCHEDULED,
            slot_id: newSlotId,
            order_date: startsAt,
            slot_starts_at: startsAt,
            slot_ends_at: endsAt,
          },
          metadata: {
            rescheduled_by: rescheduledBy,
            reason:
              rescheduleBookingDto.reason ||
              (isGarageOwner
                ? 'reschedule from garage'
                : 'reschedule by customer'),
            previous_slot_deleted: wasPastSlotDeleted,
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
        order_date: true,
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
            starts_at: true,
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

      const wasPastSlotDeleted = Boolean(
        booking.slot_id &&
          booking.slot?.ends_at &&
          booking.slot.ends_at <= new Date(),
      );

      await tx.auditLog.create({
        data: {
          table_name: 'Booking',
          record_id: booking.id,
          action: AuditAction.CANCELLATION,
          actor_id: user_id,
          actor_type: isGarageOwner ? 'garage' : 'user',
          garage_id: booking.garage_id,
          old_values: {
            status: booking.status,
            slot_id: booking.slot_id,
            order_date: booking.order_date,
            slot_starts_at: booking.slot?.starts_at,
            slot_ends_at: booking.slot?.ends_at,
          },
          new_values: {
            status: BookingStatus.CANCELLED,
            slot_id: null,
            order_date: booking.order_date,
            slot_starts_at: null,
            slot_ends_at: null,
          },
          metadata: {
            cancelled_by: cancelledBy,
            cancel_reason: cancelBookingDto.reason,
            slot_deleted: wasPastSlotDeleted,
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

  async updateNote(
    user_id: string,
    booking_id: string,
    dto: UpdateBookingNoteDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, kind: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.kind !== UserKind.GARAGE) {
      throw new ForbiddenException(
        'Only garage operators can update booking notes',
      );
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: booking_id },
      select: {
        id: true,
        garage: {
          select: {
            owner_id: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.garage?.owner_id !== user_id) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    const noteContent =
      dto.garage_note !== undefined
        ? dto.garage_note
        : dto.note !== undefined
          ? dto.note
          : '';

    const updated = await this.prisma.booking.update({
      where: { id: booking_id },
      data: {
        garage_note: noteContent,
      },
      select: {
        id: true,
        garage_note: true,
        updated_at: true,
      },
    });

    return ResponseHelper.success({
      message: 'Booking note updated successfully',
      data: updated,
    });
  }
}

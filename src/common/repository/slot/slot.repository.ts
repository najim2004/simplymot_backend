import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DayOfWeek, TimeSlotStatus } from '@generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';

type SlotSource = 'DATABASE' | 'TEMPLATE';
type SlotStatus = TimeSlotStatus;
type SlotDisplayStatus = SlotStatus | 'PAST';

type SlotWindow = {
  starts_at: Date;
  ends_at: Date;
  description?: string;
};

type SlotResponse = SlotWindow & {
  id?: string;
  source: SlotSource;
  status: SlotDisplayStatus;
  bookable: boolean;
  description: string | null;
};

@Injectable()
export class SlotRepository {
  private readonly dayMap = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];

  constructor(private readonly prisma: PrismaService) {}

  async getSlots(garage_id: string, query: { date?: Date } = {}) {
    const { start: dayStart, end: dayEnd } = this.getDayBounds(query.date);
    const dayOfWeek = this.dayMap[dayStart.getDay()];

    let garage = await this.prisma.garage.findUnique({
      where: { id: garage_id },
      select: {
        id: true,
        schedule: {
          select: {
            id: true,
            schedule_intervals: {
              where: { day_of_week: dayOfWeek },
              select: {
                is_closed: true,
                slot_duration: true,
                buffer_time: true,
                open_time: true,
                close_time: true,
              },
              take: 1,
            },
            breakTimes: {
              where: {
                starts_at: { lt: dayEnd },
                ends_at: { gt: dayStart },
              },
              select: {
                starts_at: true,
                ends_at: true,
                description: true,
              },
              orderBy: { starts_at: 'asc' },
            },
            holidays: {
              where: {
                OR: [
                  { date: { gte: dayStart, lt: dayEnd } },
                  { is_recurring: true },
                ],
              },
              select: {
                date: true,
                name: true,
                is_recurring: true,
              },
            },
          },
        },
      },
    });

    if (!garage) throw new NotFoundException('Garage not found');

    if (!garage.schedule) {
      await this.prisma.schedule.create({
        data: {
          garage_id: garage.id,
          schedule_intervals: {
            create: this.dayMap.map((day) => ({
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
            })),
          },
          breakTimes: {
            create: [
              {
                starts_at: new Date('1970-01-01T13:00:00.000Z'),
                ends_at: new Date('1970-01-01T14:00:00.000Z'),
                description: 'Lunch Break',
              },
            ],
          },
        },
      });

      garage = await this.prisma.garage.findUnique({
        where: { id: garage_id },
        select: {
          id: true,
          schedule: {
            select: {
              id: true,
              schedule_intervals: {
                where: { day_of_week: dayOfWeek },
                select: {
                  is_closed: true,
                  slot_duration: true,
                  buffer_time: true,
                  open_time: true,
                  close_time: true,
                },
                take: 1,
              },
              breakTimes: {
                where: {
                  starts_at: { lt: dayEnd },
                  ends_at: { gt: dayStart },
                },
                select: {
                  starts_at: true,
                  ends_at: true,
                  description: true,
                },
                orderBy: { starts_at: 'asc' },
              },
              holidays: {
                where: {
                  OR: [
                    { date: { gte: dayStart, lt: dayEnd } },
                    { is_recurring: true },
                  ],
                },
                select: {
                  date: true,
                  name: true,
                  is_recurring: true,
                },
              },
            },
          },
        },
      });
    }

    if (!garage || !garage.schedule)
      throw new NotFoundException('Schedule not found');

    const interval = garage.schedule.schedule_intervals[0];
    const holiday = garage.schedule.holidays.find((item) =>
      item.is_recurring
        ? this.isRecurringHoliday(item.date, dayStart)
        : this.isSameDay(item.date, dayStart),
    );
    const isClosed = !interval || interval.is_closed || Boolean(holiday);

    const dbSlots = await this.getDatabaseSlots(garage.id, dayStart, dayEnd);
    const breakSlots = this.getBreakSlots(
      garage.schedule.breakTimes,
      dayStart,
      dayEnd,
    );
    const visibleBreakSlots = breakSlots.filter(
      (breakSlot) => !dbSlots.some((slot) => this.overlaps(slot, breakSlot)),
    );

    const templateSlots =
      isClosed || !interval
        ? []
        : this.getTemplateSlots({
            dayStart,
            openMinutes: this.timeToMinutes(interval.open_time),
            closeMinutes: this.timeToMinutes(interval.close_time),
            duration: interval.slot_duration ?? 60,
            buffer: interval.buffer_time ?? 0,
            occupied: [...dbSlots, ...breakSlots],
          });

    const now = new Date();
    const slots = [...dbSlots, ...templateSlots, ...visibleBreakSlots]
      .sort(
        (first, second) =>
          first.starts_at.getTime() - second.starts_at.getTime() ||
          first.ends_at.getTime() - second.ends_at.getTime(),
      )
      .map((slot) => {
        if (slot.ends_at <= now && slot.status === TimeSlotStatus.AVAILABLE) {
          return { ...slot, status: 'PAST' as const, bookable: false };
        }

        return {
          ...slot,
          bookable: slot.status === TimeSlotStatus.AVAILABLE,
        };
      });

    return {
      garage_id: garage.id,
      schedule_id: garage.schedule.id,
      date: this.formatDate(dayStart),
      day_of_week: dayOfWeek,
      is_closed: isClosed,
      is_holiday: Boolean(holiday),
      holiday_name: holiday?.name ?? null,
      slot_duration: interval?.slot_duration ?? null,
      buffer_time: interval?.buffer_time ?? null,
      open_time: interval?.open_time
        ? this.formatScheduleTime(interval.open_time)
        : null,
      close_time: interval?.close_time
        ? this.formatScheduleTime(interval.close_time)
        : null,
      slots,
      summary: this.getSummary(slots),
    };
  }

  private async getDatabaseSlots(
    garageId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<SlotResponse[]> {
    const slots = await this.prisma.timeSlot.findMany({
      where: {
        garage_id: garageId,
        starts_at: { lt: dayEnd },
        ends_at: { gt: dayStart },
      },
      select: {
        id: true,
        starts_at: true,
        ends_at: true,
        status: true,
        description: true,
      },
      orderBy: { starts_at: 'asc' },
    });

    return slots.map((slot) => this.toSlot(slot, 'DATABASE', slot.status));
  }

  async blockUnblockSlots(
    garageId: string,
    input: {
      id?: string;
      start_time?: Date;
      end_time?: Date;
      description?: string;
    },
    type: 'block' | 'unblock',
  ) {
    if (!input.id && !input.start_time) {
      throw new BadRequestException('id or start_time is required');
    }

    const garage = await this.prisma.garage.findUnique({
      where: { id: garageId },
      select: {
        id: true,
        schedule: { select: { id: true } },
      },
    });
    if (!garage) throw new NotFoundException('Garage not found');
    if (!garage.schedule) throw new NotFoundException('Schedule not found');

    const slot = await this.prisma.timeSlot.findFirst({
      where: {
        garage_id: garage.id,
        ...(input.id ? { id: input.id } : { starts_at: input.start_time }),
      },
      select: {
        id: true,
        starts_at: true,
        ends_at: true,
        status: true,
        booking_id: true,
      },
    });

    if (!slot && type === 'unblock') {
      throw new NotFoundException('Blocked slot not found');
    }

    const startsAt = slot?.starts_at ?? input.start_time;
    const endsAt = slot?.ends_at ?? input.end_time;
    if (!startsAt || !endsAt) {
      throw new BadRequestException('start_time and end_time are required');
    }
    if (endsAt <= new Date()) {
      throw new BadRequestException(
        'Past slots cannot be blocked or unblocked',
      );
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException('end_time must be after start_time');
    }
    if (slot?.booking_id || slot?.status === TimeSlotStatus.BOOKED) {
      throw new BadRequestException(
        'Booked slots cannot be blocked or unblocked',
      );
    }

    const data =
      type === 'block'
        ? {
            status: TimeSlotStatus.BLOCKED,
            description: input.description ?? null,
          }
        : {
            status: TimeSlotStatus.AVAILABLE,
            description: null,
          };

    const updatedSlot = slot
      ? await this.prisma.timeSlot.update({
          where: { id: slot.id },
          data,
          select: {
            id: true,
            starts_at: true,
            ends_at: true,
            status: true,
            description: true,
          },
        })
      : await this.prisma.timeSlot.create({
          data: {
            garage_id: garage.id,
            schedule_id: garage.schedule.id,
            starts_at: startsAt,
            ends_at: endsAt,
            ...data,
          },
          select: {
            id: true,
            starts_at: true,
            ends_at: true,
            status: true,
            description: true,
          },
        });

    const slotResponse = this.toSlot(
      updatedSlot,
      'DATABASE',
      updatedSlot.status,
    );

    if (
      slotResponse.ends_at <= new Date() &&
      slotResponse.status === TimeSlotStatus.AVAILABLE
    ) {
      return { ...slotResponse, status: 'PAST' as const, bookable: false };
    }

    return {
      ...slotResponse,
      bookable: slotResponse.status === TimeSlotStatus.AVAILABLE,
    };
  }

  private getBreakSlots(
    breaks: SlotWindow[],
    dayStart: Date,
    dayEnd: Date,
  ): SlotResponse[] {
    return breaks.map((item) =>
      this.toSlot(
        {
          starts_at: item.starts_at < dayStart ? dayStart : item.starts_at,
          ends_at: item.ends_at > dayEnd ? dayEnd : item.ends_at,
          description: item.description ?? 'Break time',
        },
        'TEMPLATE',
        TimeSlotStatus.BREAK,
      ),
    );
  }

  private getTemplateSlots(params: {
    dayStart: Date;
    openMinutes: number;
    closeMinutes: number;
    duration: number;
    buffer: number;
    occupied: SlotWindow[];
  }): SlotResponse[] {
    const slots: SlotResponse[] = [];
    const step = params.duration + params.buffer;
    const occupied = [...params.occupied].sort(
      (first, second) =>
        first.starts_at.getTime() - second.starts_at.getTime() ||
        first.ends_at.getTime() - second.ends_at.getTime(),
    );
    let occupiedIndex = 0;

    if (
      params.duration <= 0 ||
      params.buffer < 0 ||
      params.openMinutes >= params.closeMinutes ||
      params.openMinutes + params.duration > params.closeMinutes
    ) {
      return slots;
    }

    for (
      let cursor = params.openMinutes;
      cursor + params.duration <= params.closeMinutes;
      cursor += step
    ) {
      const candidate = {
        starts_at: this.minutesToDate(params.dayStart, cursor),
        ends_at: this.minutesToDate(params.dayStart, cursor + params.duration),
      };

      while (
        occupiedIndex < occupied.length &&
        occupied[occupiedIndex].ends_at <= candidate.starts_at
      ) {
        occupiedIndex++;
      }

      let hasOverlap = false;
      for (
        let index = occupiedIndex;
        index < occupied.length &&
        occupied[index].starts_at < candidate.ends_at;
        index++
      ) {
        if (this.overlaps(candidate, occupied[index])) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        slots.push(
          this.toSlot(candidate, 'TEMPLATE', TimeSlotStatus.AVAILABLE),
        );
      }
    }

    return slots;
  }

  private toSlot(
    slot: SlotWindow & { id?: string },
    source: SlotSource,
    status: SlotStatus,
  ): SlotResponse {
    return {
      id: slot.id,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      source,
      status,
      bookable: false,
      description: slot.description ?? null,
    };
  }

  private getSummary(slots: SlotResponse[]) {
    const count = (status: SlotDisplayStatus) =>
      slots.filter((slot) => slot.status === status).length;

    return {
      total_slots: slots.length,
      past_slots: count('PAST'),
      break_slots: count(TimeSlotStatus.BREAK),
      available_slots: count(TimeSlotStatus.AVAILABLE),
      booked_slots: count(TimeSlotStatus.BOOKED),
      blocked_slots: count(TimeSlotStatus.BLOCKED),
      bookable_slots: slots.filter((slot) => slot.bookable).length,
    };
  }

  private getDayBounds(date?: Date) {
    const target = date ? new Date(date) : new Date();
    if (Number.isNaN(target.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    const start = new Date(target);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
  }

  private timeToMinutes(time?: Date | string | null): number {
    if (!time) {
      throw new BadRequestException('Schedule open/close time is missing');
    }

    if (time instanceof Date) {
      return time.getUTCHours() * 60 + time.getUTCMinutes();
    }

    const [hours, minutes] = time.split(':').map(Number);
    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException(`Invalid time format: ${time}`);
    }

    return hours * 60 + minutes;
  }

  private minutesToDate(dayStart: Date, minutes: number): Date {
    const date = new Date(dayStart);
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return date;
  }

  private overlaps(first: SlotWindow, second: SlotWindow): boolean {
    return first.starts_at < second.ends_at && first.ends_at > second.starts_at;
  }

  private isSameDay(first: Date, second: Date): boolean {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
    );
  }

  private isRecurringHoliday(holidayDate: Date, targetDate: Date) {
    return (
      holidayDate.getMonth() === targetDate.getMonth() &&
      holidayDate.getDate() === targetDate.getDate()
    );
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private formatScheduleTime(time: Date | string): string {
    if (typeof time === 'string') return time.slice(0, 5);

    return `${String(time.getUTCHours()).padStart(2, '0')}:${String(
      time.getUTCMinutes(),
    ).padStart(2, '0')}`;
  }
}

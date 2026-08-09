import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ScheduleIntervalDto,
  UpdateGarageDto,
  UpsertScheduleDto,
  UpsertServiceDto,
} from './dto/update-garage.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { DayOfWeek, ServiceType } from '@generated/prisma/enums';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { StringHelper } from 'src/common/helper/string.helper';
import appConfig from 'src/config/app.config';
import { Logger } from '@nestjs/common';
import { DvlaService } from 'src/common/lib/DVLA/DvlaService';
import { CreateBreakTimeDto, CreateHolidayDto } from './dto/create-garage.dto';
import {
  BlockUnblockSlotsDto,
  DiscoverGarageQueryDto,
  GetGarageSlotsQueryDto,
  Sort,
  SortOrder,
} from './dto/query-garage.dto';
import { Prisma, Vehicle } from '@generated/prisma';
import { SlotRepository } from 'src/common/repository/slot/slot.repository';
import { VehicleRepository } from 'src/common/repository/vehicle/vehicle.repository';
import { PostCodeMapRepository } from 'src/common/repository/post-code-map/post-code-map.repository';

type DiscoverVehicleDetails = {
  id: string | null;
  registration_number: string;
  make: string | null;
  model: string | null;
  color: string | null;
  fuel_type: string | null;
  engine_capacity: number | null;
  co2_emissions: number | null;
  mot_status: string | null;
  is_expired: boolean;
  mot_expiry_date: Date | null;
  mot_last_checked_at: Date | null;
  reminder_last_sent_at: Date | null;
  year_of_manufacture: number | null;
};
function formatTimeHHmm(date: Date | string | null): string | null {
  if (!date) return null;
  if (typeof date === 'string') {
    if (date.length === 5 && date.includes(':')) return date;
    date = new Date(date);
  }
  if (Number.isNaN((date as Date).getTime())) return null;
  const hours = String((date as Date).getUTCHours()).padStart(2, '0');
  const minutes = String((date as Date).getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

type ServiceWithClass = {
  id: string;
  title: string;
  price: unknown;
  type: ServiceType;
  vehicle_class?: string | null;
};

function formatServicesResponse(services: ServiceWithClass[]) {
  const motAndRetest = services.filter(
    (s) => s.type === ServiceType.MOT || s.type === ServiceType.RETEST,
  );
  const otherServices = services.filter(
    (s) => s.type !== ServiceType.MOT && s.type !== ServiceType.RETEST,
  );

  const mot_services_map: Record<
    string,
    {
      vehicle_class: string | null;
      mot: ServiceWithClass | null;
      mot_retest: ServiceWithClass | null;
    }
  > = {};

  motAndRetest.forEach((service) => {
    const clsKey = service.vehicle_class || 'default';
    if (!mot_services_map[clsKey]) {
      mot_services_map[clsKey] = {
        vehicle_class: service.vehicle_class || null,
        mot: null,
        mot_retest: null,
      };
    }
    if (service.type === ServiceType.MOT) {
      mot_services_map[clsKey].mot = service;
    } else if (service.type === ServiceType.RETEST) {
      mot_services_map[clsKey].mot_retest = service;
    }
  });

  return {
    mot_services: Object.values(mot_services_map),
    other_services: otherServices,
  };
}

@Injectable()
export class GarageService {
  private readonly logger = new Logger(GarageService.name);
  private readonly dayOfWeekOrder: DayOfWeek[] = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
    DayOfWeek.SUNDAY,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly slotRepository: SlotRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly postCodeMapRepository: PostCodeMapRepository,
  ) {}

  private normalizeRegistrationNumber(registration_number: string) {
    return registration_number.replace(/\s/g, '').toUpperCase();
  }

  private formatVehicle(vehicle: Vehicle): DiscoverVehicleDetails {
    return {
      id: vehicle.id,
      registration_number: vehicle.registration_number,
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color,
      fuel_type: vehicle.fuel_type,
      engine_capacity: vehicle.engine_capacity,
      co2_emissions: vehicle.co2_emissions,
      mot_status: vehicle.mot_status,
      is_expired: vehicle.is_expired,
      mot_expiry_date: vehicle.mot_expiry_date,
      mot_last_checked_at: vehicle.mot_last_checked_at,
      reminder_last_sent_at: vehicle.reminder_last_sent_at,
      year_of_manufacture: vehicle.year_of_manufacture,
    };
  }

  private formatDvlaVehicle(
    registration_number: string,
    dvlaData: Awaited<ReturnType<typeof DvlaService.getVehicleDetails>>,
  ): DiscoverVehicleDetails {
    return {
      id: null,
      registration_number,
      make: dvlaData.make ?? null,
      model: null,
      color: dvlaData.colour ?? null,
      fuel_type: dvlaData.fuelType ?? null,
      engine_capacity: dvlaData.engineCapacity ?? null,
      co2_emissions: dvlaData.co2Emissions ?? null,
      mot_status: dvlaData.motStatus ?? null,
      is_expired: false,
      mot_expiry_date: dvlaData.motExpiryDate
        ? new Date(dvlaData.motExpiryDate)
        : null,
      mot_last_checked_at: new Date(),
      reminder_last_sent_at: null,
      year_of_manufacture: dvlaData.yearOfManufacture ?? null,
    };
  }

  private async getDiscoverVehicle(
    registration_number: string,
    user_id?: string,
  ): Promise<DiscoverVehicleDetails> {
    const normalizedRegistrationNumber =
      this.normalizeRegistrationNumber(registration_number);

    let vehicle = await this.prisma.vehicle.findUnique({
      where: {
        registration_number: normalizedRegistrationNumber,
      },
    });

    if (!user_id) {
      if (!vehicle) {
        const dvlaData = await DvlaService.getVehicleDetails(
          normalizedRegistrationNumber,
        );

        return this.formatDvlaVehicle(normalizedRegistrationNumber, dvlaData);
      }

      return this.formatVehicle(vehicle);
    }

    if (user_id && vehicle?.user_id && vehicle.user_id !== user_id) {
      throw new ConflictException(
        `This vehicle-(${normalizedRegistrationNumber}) is already have an owner`,
      );
    }

    if (vehicle && user_id && !vehicle.user_id) {
      vehicle = await this.prisma.vehicle.update({
        where: {
          id: vehicle.id,
        },
        data: {
          user_id,
        },
      });
    }

    if (!vehicle) {
      vehicle = await this.prisma.vehicle.create({
        data: {
          registration_number: normalizedRegistrationNumber,
          ...(user_id ? { user_id } : {}),
        },
      });
    }

    if (
      this.vehicleRepository.shouldRefreshMotData(vehicle.mot_last_checked_at)
    ) {
      try {
        vehicle =
          await this.vehicleRepository.refreshVehicleDataFromDvla(vehicle);
      } catch (error) {
        this.logger.error(
          `Failed to refresh vehicle MOT data for ${normalizedRegistrationNumber}`,
          error,
        );
      }
    }

    return this.formatVehicle(vehicle);
  }

  async getGarage(user_id: string) {
    const garage = await this.prisma.garage.findFirst({
      where: {
        owner_id: user_id,
      },
      select: {
        id: true,
        garage_name: true,
        vts_number: true,
        contact_email: true,
        phone_number: true,
        address: true,
        garage_image: true,
        post_code: true,
        services: {
          where: {
            OR: [{ type: ServiceType.MOT }, { vehicle_class: 'Class 4' }],
          },
          select: {
            price: true,
          },
          take: 1,
        },
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }
    const formattedGarage = {
      id: garage.id,
      garage_name: garage.garage_name,
      vts_number: garage.vts_number,
      contact_email: garage.contact_email,
      phone_number: garage.phone_number,
      address: garage.address,
      garage_image: garage?.garage_image
        ? SojebStorage.url(garage?.garage_image)
        : null,
      mot_price: garage.services?.[0]?.price ?? null,
      post_code: garage.post_code,
    };
    return ResponseHelper.success({
      message: 'Garage fetched successfully',
      data: formattedGarage,
    });
  }

  async updateGarage(
    updateGarageDto: UpdateGarageDto,
    garage_id: string,
    user_id: string,
  ) {
    const garage = await this.prisma.garage.findUnique({
      where: {
        id: garage_id,
        owner_id: user_id,
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }
    let garage_image = garage.garage_image;
    if (updateGarageDto.garage_image) {
      if (garage.garage_image) {
        try {
          await SojebStorage.delete(garage.garage_image);
        } catch (error) {
          this.logger.error(
            'Error deleting old garage image in update garage api',
            error,
          );
        }
      }
      const fileName =
        appConfig().storageUrl.garage +
        `/${StringHelper.randomString()}${updateGarageDto.garage_image.originalname}`;
      await SojebStorage.put(fileName, updateGarageDto.garage_image.buffer);
      garage_image = fileName;
    }

    const {
      garage_image: _garageImage,
      post_code,
      ...garageData
    } = updateGarageDto;
    const incomingPostCode = post_code;
    const locationData: {
      post_code?: string;
      latitude?: number;
      longitude?: number;
    } = {};

    if (incomingPostCode) {
      const location =
        await this.postCodeMapRepository.getLatLng(incomingPostCode);

      locationData.post_code = incomingPostCode.trim().toUpperCase();
      locationData.latitude = location.lat;
      locationData.longitude = location.lng;
    }

    const updatedGarage = await this.prisma.garage.update({
      where: {
        id: garage.id,
      },
      data: {
        ...garageData,
        ...locationData,
        garage_image,
      },
    });
    if (!updatedGarage) {
      throw new InternalServerErrorException('Garage not updated');
    }
    return ResponseHelper.success({
      message: 'Garage updated successfully',
      data: updatedGarage,
    });
  }

  async getServices(garage_id: string, user_id: string) {
    const garage = await this.prisma.garage.findUnique({
      where: {
        id: garage_id,
        owner_id: user_id,
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }
    const services = await this.prisma.service.findMany({
      where: {
        garage_id: garage.id,
      },
      select: {
        id: true,
        title: true,
        price: true,
        type: true,
        vehicle_class: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const formattedServices = formatServicesResponse(services);

    return ResponseHelper.success({
      message: 'Services fetched successfully',
      data: formattedServices,
    });
  }

  async upsertService(
    updateGarageDto: UpsertServiceDto,
    garage_id: string,
    user_id: string,
  ) {
    const services = updateGarageDto.services || [];
    const garage = await this.prisma.garage.findUnique({
      where: {
        id: garage_id,
        owner_id: user_id,
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        const { id, type, ...rest } = service;
        const vehicleClass = service.vehicle_class ?? null;

        if (type === ServiceType.MOT || type === ServiceType.RETEST) {
          const whereClause: Prisma.ServiceWhereInput = {
            garage_id: garage.id,
            type: service.type,
            ...(vehicleClass ? { vehicle_class: vehicleClass } : {}),
          };

          const title =
            service.title ||
            (service.type === ServiceType.MOT ? 'MOT' : 'MOT Retest');

          const existingService = await this.prisma.service.findFirst({
            where: whereClause,
          });

          return await this.prisma.service.upsert({
            where: {
              id: existingService?.id || service.id || '',
            },
            update: {
              price: rest.price,
              title: service.title,
            },
            create: {
              garage_id: garage.id,
              type: type,
              price: rest.price ?? 0,
              title,
              vehicle_class: vehicleClass,
            },
            select: {
              id: true,
              title: true,
              price: true,
              type: true,
              vehicle_class: true,
            },
          });
        } else {
          return await this.prisma.service.upsert({
            where: {
              id: service.id || '',
            },
            update: {
              title: service.title,
              price: rest.price,
            },
            create: {
              garage_id: garage.id,
              type: type,
              price: rest.price ?? 0,
              title: service.title || 'Service',
            },
            select: {
              id: true,
              title: true,
              price: true,
              type: true,
            },
          });
        }
      }),
    );
    return ResponseHelper.success({
      message: 'Services updated successfully',
      data: updatedServices,
    });
  }

  async deleteService(id: string, user_id: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        id,
        garage: {
          owner_id: user_id,
        },
      },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    const deletedService = await this.prisma.service.delete({
      where: {
        id,
      },
    });
    if (!deletedService) {
      throw new InternalServerErrorException('Service not deleted');
    }
    return ResponseHelper.success({
      message: 'Service deleted successfully',
      data: deletedService,
    });
  }

  async getSchedule(garage_id: string, user_id: string) {
    const garage = await this.prisma.garage.findUnique({
      where: {
        id: garage_id,
        owner_id: user_id,
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }
    let schedule = await this.prisma.schedule.findFirst({
      where: {
        garage_id: garage.id,
      },
      select: {
        id: true,
        garage_id: true,
        schedule_intervals: {
          select: {
            id: true,
            day_of_week: true,
            is_closed: true,
            slot_duration: true,
            buffer_time: true,
            open_time: true,
            close_time: true,
            break_times: {
              select: {
                id: true,
                start_time: true,
                end_time: true,
                description: true,
                schedule_interval_id: true,
              },
            },
          },
        },
      },
    });
    if (!schedule) {
      schedule = await this.prisma.schedule.create({
        data: {
          garage_id: garage.id,
          schedule_intervals: {
            create: this.dayOfWeekOrder.map((day) => ({
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
        select: {
          id: true,
          garage_id: true,
          schedule_intervals: {
            select: {
              id: true,
              day_of_week: true,
              is_closed: true,
              slot_duration: true,
              buffer_time: true,
              open_time: true,
              close_time: true,
              break_times: {
                select: {
                  id: true,
                  start_time: true,
                  end_time: true,
                  description: true,
                  schedule_interval_id: true,
                },
              },
            },
          },
        },
      });
    }
    const formattedIntervals = (schedule?.schedule_intervals || []).map(
      (i) => ({
        ...i,
        open_time: formatTimeHHmm(i.open_time),
        close_time: formatTimeHHmm(i.close_time),
        break_times: (i.break_times || []).map((b) => ({
          ...b,
          start_time: formatTimeHHmm(b.start_time),
          end_time: formatTimeHHmm(b.end_time),
        })),
      }),
    );

    return ResponseHelper.success({
      message: 'Schedule fetched successfully',
      data: {
        ...schedule,
        schedule_intervals: formattedIntervals,
      },
    });
  }

  async upsertSchedule(
    upsertScheduleDto: UpsertScheduleDto,
    garage_id: string,
    user_id: string,
  ) {
    const garage = await this.prisma.garage.findUnique({
      where: {
        id: garage_id,
        owner_id: user_id,
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }

    const { schedule_intervals } = upsertScheduleDto;

    const existingSchedule = await this.prisma.schedule.findUnique({
      where: { garage_id: garage.id },
      include: { schedule_intervals: true },
    });

    const existingDays = new Set(
      existingSchedule?.schedule_intervals.map((i) => i.day_of_week) || [],
    );

    const getNextDay = () => {
      const day = this.dayOfWeekOrder.find((d) => !existingDays.has(d));
      if (!day) throw new BadRequestException('All days already assigned');
      existingDays.add(day);
      return day;
    };

    const existing = schedule_intervals.filter((i) => i.id);
    const newItems = schedule_intervals.filter((i) => !i.id);

    const parseTimeStringToDate = (
      timeStr?: string | Date | null,
    ): Date | null => {
      if (!timeStr) return null;
      if (timeStr instanceof Date) return timeStr;
      if (typeof timeStr === 'string' && timeStr.includes('T'))
        return new Date(timeStr);
      return new Date(`1970-01-01T${timeStr}:00.000Z`);
    };

    const toCreateInput = (i: ScheduleIntervalDto) => ({
      day_of_week: i.day_of_week ?? getNextDay(),
      is_closed: i.is_closed ?? false,
      slot_duration: i.slot_duration ?? 60,
      buffer_time: i.buffer_time ?? 0,
      open_time: parseTimeStringToDate(i.open_time ?? '09:00'),
      close_time: parseTimeStringToDate(i.close_time ?? '17:00'),
      break_times: Array.isArray(i.break_times)
        ? {
            create: i.break_times.map((b) => ({
              start_time: parseTimeStringToDate(b.start_time),
              end_time: parseTimeStringToDate(b.end_time),
              description: b.description,
            })),
          }
        : undefined,
    });

    const schedule = await this.prisma.schedule.upsert({
      where: { garage_id: garage.id },

      update: {
        schedule_intervals: {
          upsert: existing.map((i) => ({
            where: { id: i.id },
            update: {
              is_closed: i.is_closed,
              slot_duration: i.slot_duration,
              buffer_time: i.buffer_time,
              open_time: parseTimeStringToDate(i.open_time),
              close_time: parseTimeStringToDate(i.close_time),
              ...(Array.isArray(i.break_times)
                ? {
                    break_times: {
                      deleteMany: {},
                      create: i.break_times.map((b) => ({
                        start_time: parseTimeStringToDate(b.start_time),
                        end_time: parseTimeStringToDate(b.end_time),
                        description: b.description,
                      })),
                    },
                  }
                : {}),
            },
            create: toCreateInput(i),
          })),

          create: newItems.map(toCreateInput),
        },
      },

      create: {
        garage_id: garage.id,
        schedule_intervals: {
          create: schedule_intervals.map(toCreateInput),
        },
      },

      include: {
        schedule_intervals: {
          include: {
            break_times: true,
          },
        },
      },
    });
    if (!schedule) {
      throw new InternalServerErrorException('Schedule not updated');
    }
    return ResponseHelper.success({
      message: 'Schedule updated successfully',
      data: schedule,
    });
  }

  async createBreakTime(
    createBreakTimeDto: CreateBreakTimeDto,
    garage_id: string,
    schedule_interval_id: string,
    user_id: string,
  ) {
    const garage = await this.prisma.garage.findUnique({
      where: {
        id: garage_id,
        owner_id: user_id,
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }
    const interval = await this.prisma.scheduleInterval.findFirst({
      where: {
        id: schedule_interval_id,
        schedule: {
          garage_id: garage.id,
        },
      },
    });
    if (!interval) {
      throw new NotFoundException('Schedule interval not found');
    }

    const parseTimeStringToDate = (timeStr: string): Date => {
      if (timeStr.includes('T')) return new Date(timeStr);
      return new Date(`1970-01-01T${timeStr}:00.000Z`);
    };

    const startTimeDate = parseTimeStringToDate(createBreakTimeDto.start_time);
    const endTimeDate = parseTimeStringToDate(createBreakTimeDto.end_time);

    if (startTimeDate.getTime() >= endTimeDate.getTime()) {
      throw new BadRequestException('start_time must be earlier than end_time');
    }

    const breakTime = await this.prisma.breakTime.create({
      data: {
        schedule_interval_id: interval.id,
        start_time: startTimeDate,
        end_time: endTimeDate,
        description: createBreakTimeDto.description,
      },
      select: {
        id: true,
        start_time: true,
        end_time: true,
        description: true,
        schedule_interval_id: true,
      },
    });

    return ResponseHelper.success({
      message: 'Break time created successfully',
      data: {
        ...breakTime,
        start_time: formatTimeHHmm(breakTime.start_time),
        end_time: formatTimeHHmm(breakTime.end_time),
      },
    });
  }

  async getBreakTimes(
    garage_id: string,
    schedule_interval_id: string,
    user_id: string,
  ) {
    const garage = await this.prisma.garage.findUnique({
      where: {
        id: garage_id,
        owner_id: user_id,
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }
    const interval = await this.prisma.scheduleInterval.findFirst({
      where: {
        id: schedule_interval_id,
        schedule: {
          garage_id: garage.id,
        },
      },
    });
    if (!interval) {
      throw new NotFoundException('Schedule interval not found');
    }

    const breakTimes = await this.prisma.breakTime.findMany({
      where: {
        schedule_interval_id: interval.id,
      },
      select: {
        id: true,
        start_time: true,
        end_time: true,
        description: true,
        schedule_interval_id: true,
      },
      orderBy: { start_time: 'asc' },
    });

    const formatted = breakTimes.map((b) => ({
      ...b,
      start_time: formatTimeHHmm(b.start_time),
      end_time: formatTimeHHmm(b.end_time),
    }));

    return ResponseHelper.success({
      message: 'Break times fetched successfully',
      data: formatted,
    });
  }

  async deleteBreakTime(
    break_time_id: string,
    garage_id: string,
    user_id: string,
  ) {
    const garage = await this.prisma.garage.findUnique({
      where: {
        id: garage_id,
        owner_id: user_id,
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }
    const breakTime = await this.prisma.breakTime.findFirst({
      where: {
        id: break_time_id,
        schedule_interval: {
          schedule: {
            garage_id: garage.id,
          },
        },
      },
    });
    if (!breakTime) {
      throw new NotFoundException('Break time not found');
    }

    await this.prisma.breakTime.delete({
      where: { id: break_time_id },
    });

    return ResponseHelper.success({
      message: 'Break time deleted successfully',
      data: {
        id: break_time_id,
      },
    });
  }

  async createHoliday(
    createHolidayDto: CreateHolidayDto,
    garage_id: string,
    schedule_id: string,
    user_id: string,
  ) {
    const garage = await this.prisma.garage.findUnique({
      where: {
        id: garage_id,
        owner_id: user_id,
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }
    const schedule = await this.prisma.schedule.findUnique({
      where: {
        id: schedule_id,
        garage_id: garage.id,
      },
    });
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }
    const holiday = await this.prisma.holiday.create({
      data: {
        schedule_id: schedule.id,
        date: createHolidayDto.date,
        name: createHolidayDto.name,
      },
      select: {
        id: true,
        date: true,
        name: true,
      },
    });
    if (!holiday) {
      throw new InternalServerErrorException('Holiday not created');
    }
    return ResponseHelper.success({
      message: 'Holiday created successfully',
      data: holiday,
    });
  }

  async getHolidays(
    garage_id: string,
    schedule_id: string,
    user_id: string,
    year: string = new Date().getFullYear().toString(),
  ) {
    const garage = await this.prisma.garage.findUnique({
      where: {
        id: garage_id,
        owner_id: user_id,
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }
    const schedule = await this.prisma.schedule.findUnique({
      where: {
        id: schedule_id,
        garage_id: garage.id,
      },
    });
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }
    const holidays = await this.prisma.holiday.findMany({
      where: {
        schedule_id: schedule.id,
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
      select: {
        id: true,
        date: true,
        name: true,
      },
    });
    if (!holidays) {
      throw new InternalServerErrorException('Holidays not found');
    }
    return ResponseHelper.success({
      message: 'Holidays fetched successfully',
      data: holidays,
    });
  }

  async deleteHoliday(
    holiday_id: string,
    garage_id: string,
    schedule_id: string,
    user_id: string,
  ) {
    const garage = await this.prisma.garage.findUnique({
      where: {
        id: garage_id,
        owner_id: user_id,
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }

    const schedule = await this.prisma.schedule.findUnique({
      where: {
        id: schedule_id,
        garage_id: garage.id,
      },
    });
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    const holiday = await this.prisma.holiday.findUnique({
      where: {
        id: holiday_id,
        schedule: {
          garage_id: garage.id,
        },
      },
    });
    if (!holiday) {
      throw new NotFoundException('Holiday not found');
    }
    const deletedHoliday = await this.prisma.holiday.delete({
      where: {
        id: holiday_id,
      },
    });
    if (!deletedHoliday) {
      throw new InternalServerErrorException('Holiday not deleted');
    }
    return ResponseHelper.success({
      message: 'Holiday deleted successfully',
      data: deletedHoliday,
    });
  }

  async getSlots(garage_id: string, query: GetGarageSlotsQueryDto = {}) {
    const slots = await this.slotRepository.getSlots(garage_id, query);

    return ResponseHelper.success({
      message: 'Slots fetched successfully',
      data: slots,
    });
  }

  async blockUnblockSlots(
    blockUnblockSlotsDto: BlockUnblockSlotsDto,
    garage_id: string,
    type: 'block' | 'unblock',
  ) {
    const slot = await this.slotRepository.blockUnblockSlots(
      garage_id,
      blockUnblockSlotsDto,
      type,
    );

    return ResponseHelper.success({
      message: `Slot ${type === 'block' ? 'blocked' : 'unblocked'} successfully`,
      data: slot,
    });
  }

  async discoverGarage(garage_id: string) {
    const garage = await this.prisma.garage.findUnique({
      where: {
        id: garage_id,
      },
      include: {
        services: {
          select: {
            id: true,
            title: true,
            price: true,
            type: true,
            vehicle_class: true,
          },
          orderBy: {
            created_at: 'desc',
          },
        },
        schedule: {
          select: {
            id: true,
            schedule_intervals: {
              select: {
                id: true,
                day_of_week: true,
                is_closed: true,
                slot_duration: true,
                buffer_time: true,
                open_time: true,
                close_time: true,
              },
            },
          },
        },
      },
    });

    if (!garage) {
      throw new NotFoundException('Garage not found');
    }

    let schedule = garage.schedule;
    if (!schedule) {
      schedule = await this.prisma.schedule.create({
        data: {
          garage_id: garage.id,
          schedule_intervals: {
            create: this.dayOfWeekOrder.map((day) => ({
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
        select: {
          id: true,
          schedule_intervals: {
            select: {
              id: true,
              day_of_week: true,
              is_closed: true,
              slot_duration: true,
              buffer_time: true,
              open_time: true,
              close_time: true,
              break_times: {
                select: {
                  id: true,
                  start_time: true,
                  end_time: true,
                  description: true,
                },
              },
            },
          },
        },
      });
    }

    const services = garage.services || [];
    const formattedServices = formatServicesResponse(services);

    const formattedIntervals = (schedule?.schedule_intervals || []).map(
      (i) => ({
        ...i,
        open_time: formatTimeHHmm(i.open_time),
        close_time: formatTimeHHmm(i.close_time),
      }),
    );

    const formattedGarage = {
      id: garage.id,
      garage_name: garage.garage_name || 'Unnamed Garage',
      vts_number: garage.vts_number || 'VTS not provided',
      contact_email: garage.contact_email || 'Email not provided',
      phone_number: garage.phone_number || 'Phone not provided',
      address: garage.address || 'Address not provided',
      post_code: garage.post_code || '',
      garage_image: garage.garage_image
        ? SojebStorage.url(garage.garage_image)
        : null,
      services: formattedServices,
      schedule: schedule
        ? {
            ...schedule,
            schedule_intervals: formattedIntervals,
          }
        : null,
    };

    return ResponseHelper.success({
      message: 'Garage details fetched successfully',
      data: formattedGarage,
    });
  }

  async discoverGarages(query: DiscoverGarageQueryDto, user_id?: string) {
    const {
      vehicle_registration_number,
      post_code,
      page = 1,
      limit = 10,
      sort = Sort.DISTANCE,
      sort_order = SortOrder.ASC,
    } = query;

    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;
    const normalizedPostCode = post_code.trim().toUpperCase();
    const postCodeNoSpace =
      this.postCodeMapRepository.normalize(normalizedPostCode);
    const center =
      await this.postCodeMapRepository.getLatLng(normalizedPostCode);
    const vehicle = await this.getDiscoverVehicle(
      vehicle_registration_number,
      user_id,
    );
    const sortDirection = sort_order === SortOrder.DESC ? 'DESC' : 'ASC';

    const userSortSql =
      sort === Sort.PRICE
        ? Prisma.sql`mot_price ${Prisma.raw(sortDirection)} NULLS LAST`
        : sort === Sort.RATING || sort === Sort.REVIEWS
          ? Prisma.sql`booking_count ${Prisma.raw(sortDirection)} NULLS LAST`
          : Prisma.sql`distance_miles ${Prisma.raw(sortDirection)} NULLS LAST`;

    const [rows, count] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          id: string;
          garage_name: string | null;
          address: string | null;
          post_code: string | null;
          vts_number: string | null;
          phone_number: string | null;
          garage_image: string | null;
          mot_price: number | null;
          booking_count: number;
          exact_post_code_match: boolean;
          distance_miles: number | null;
        }>
      >(Prisma.sql`
        WITH garage_locations AS (
          SELECT
            g.id,
            g.garage_name,
            g.address,
            g.post_code,
            g.vts_number,
            g.phone_number,
            g.garage_image,
            regexp_replace(upper(coalesce(g.post_code, '')), '\\s+', '', 'g') AS normalized_post_code,
            coalesce(g.latitude, pcm.latitude) AS garage_latitude,
            coalesce(g.longitude, pcm.longitude) AS garage_longitude
          FROM "garages" g
          LEFT JOIN "post_code_map" pcm
            ON pcm.postcode = regexp_replace(upper(coalesce(g.post_code, '')), '\\s+', '', 'g')
        ),
        discovered_garages AS (
          SELECT
            gl.id,
            gl.garage_name,
            gl.address,
            gl.post_code,
            gl.vts_number,
            gl.phone_number,
            gl.garage_image,
            gl.normalized_post_code = ${postCodeNoSpace} AS exact_post_code_match,
            CASE
              WHEN gl.garage_latitude IS NOT NULL AND gl.garage_longitude IS NOT NULL THEN
                (
                  3959 * acos(
                    least(
                      1,
                      greatest(
                        -1,
                        cos(radians(${center.lat})) * cos(radians(gl.garage_latitude)) *
                        cos(radians(gl.garage_longitude) - radians(${center.lng})) +
                        sin(radians(${center.lat})) * sin(radians(gl.garage_latitude))
                      )
                    )
                  )
                )
              ELSE NULL
            END AS distance_miles,
            mot.price::float8 AS mot_price,
            (
              SELECT COUNT(*)::int
              FROM "bookings" b
              WHERE b.garage_id = gl.id
            ) AS booking_count
          FROM garage_locations gl
          LEFT JOIN LATERAL (
            SELECT s.price
            FROM "services" s
            WHERE s.garage_id = gl.id AND s.type = 'MOT'
            LIMIT 1
          ) mot ON TRUE
        )
        SELECT
          id,
          garage_name,
          address,
          post_code,
          vts_number,
          phone_number,
          garage_image,
          exact_post_code_match,
          distance_miles,
          mot_price,
          booking_count
        FROM discovered_garages
        ORDER BY
          exact_post_code_match DESC,
          CASE WHEN distance_miles IS NULL THEN 1 ELSE 0 END ASC,
          ${userSortSql},
          garage_name ASC NULLS LAST,
          id ASC
        LIMIT ${safeLimit}
        OFFSET ${offset};
      `),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "garages" g;
      `),
    ]);

    const totalCount = count[0]?.count ? Number(count[0].count) : 0;

    return ResponseHelper.success({
      message: 'Garages discovered successfully',
      data: {
        vehicle,
        garages: rows.map((row) => ({
          id: row.id,
          garage_name: row.garage_name || 'Unnamed Garage',
          address: row.address || 'Address not provided',
          post_code: row.post_code || '',
          vts_number: row.vts_number || 'VTS not provided',
          phone_number: row.phone_number || 'Phone not provided',
          garage_image: row.garage_image
            ? SojebStorage.url(row.garage_image)
            : null,
          mot_price: typeof row.mot_price === 'number' ? row.mot_price : null,
          total_bookings: row.booking_count || 0,
          exact_post_code_match: row.exact_post_code_match,
          distance_miles:
            typeof row.distance_miles === 'number'
              ? Number(row.distance_miles.toFixed(2))
              : null,
        })),
      },
      meta_data: {
        page: safePage,
        limit: safeLimit,
        total: totalCount,
        vehicle_registration_number: vehicle.registration_number,
        post_code: normalizedPostCode,
        filters: {
          sort,
          sort_order,
        },
      },
    });
  }
}

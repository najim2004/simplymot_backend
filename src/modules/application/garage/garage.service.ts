import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import {
  ScheduleIntervalDto,
  UpdateGarageDto,
  UpsertScheduleDto,
  UpsertServiceDto,
} from './dto/update-garage.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { DayOfWeek, ServiceType } from 'prisma/generated/enums';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { StringHelper } from 'src/common/helper/string.helper';
import appConfig from 'src/config/app.config';
import { Logger } from '@nestjs/common';
import { CreateBreakTimeDto, CreateHolidayDto } from './dto/create-garage.dto';

@Injectable()
export class GarageService {
  private readonly logger = new Logger(GarageService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly dayOfWeekOrder: DayOfWeek[],
  ) {
    this.dayOfWeekOrder = [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
      DayOfWeek.SUNDAY,
    ];
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
        services: {
          where: {
            type: ServiceType.MOT,
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
      mot_price: garage.services?.[0].price,
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
    const updatedGarage = await this.prisma.garage.update({
      where: {
        id: garage.id,
      },
      data: {
        ...updateGarageDto,
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
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const formattedServices = {
      mot: services.find((service) => service.type === ServiceType.MOT),
      mot_retest: services.find(
        (service) => service.type === ServiceType.RETEST,
      ),
      other_services: services.filter(
        (service) =>
          service.type !== ServiceType.MOT &&
          service.type !== ServiceType.RETEST,
      ),
    };

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
    const services = updateGarageDto.services;
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
        if (type === ServiceType.MOT || type === ServiceType.RETEST) {
          const whereClause = {
            garage_id: garage.id,
            type: service.type,
          };

          const title = service.type === ServiceType.MOT ? 'MOT' : 'MOT Retest';

          const existingService = await this.prisma.service.findFirst({
            where: whereClause,
          });

          return await this.prisma.service.upsert({
            where: {
              id: existingService?.id || '',
            },
            update: { ...rest },
            create: {
              garage_id: garage.id,
              type: type,
              price: rest.price ?? 0,
              title,
            },
            select: {
              id: true,
              title: true,
              price: true,
              type: true,
            },
          });
        } else {
          if (!service.id) {
            throw new Error(`ID required for service type: ${service.type}`);
          }

          return await this.prisma.service.upsert({
            where: {
              id: service.id || '',
            },
            update: { ...rest },
            create: {
              garage_id: garage.id,
              type: type,
              price: rest.price ?? 0,
              title: service.title,
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
              is_closed: false,
              slot_duration: 60,
              buffer_time: 0,
              open_time: '09:00',
              close_time: '17:00',
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
            },
          },
        },
      });
    }
    return ResponseHelper.success({
      message: 'Schedule fetched successfully',
      data: schedule,
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

    const toCreateInput = (i: ScheduleIntervalDto) => ({
      day_of_week: i.day_of_week ?? getNextDay(),
      is_closed: i.is_closed ?? false,
      slot_duration: i.slot_duration ?? 60,
      buffer_time: i.buffer_time ?? 0,
      open_time: i.open_time ?? '09:00',
      close_time: i.close_time ?? '17:00',
    });

    const schedule = await this.prisma.schedule.upsert({
      where: { garage_id: garage.id },

      update: {
        schedule_intervals: {
          upsert: existing.map((i) => ({
            where: { id: i.id },
            update: {
              ...i,
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
        schedule_intervals: true,
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
    const breakTime = await this.prisma.breakTime.create({
      data: {
        schedule_id: schedule.id,
        starts_at: createBreakTimeDto.starts_at,
        ends_at: createBreakTimeDto.ends_at,
        description: createBreakTimeDto.description,
      },
      select: {
        id: true,
        starts_at: true,
        ends_at: true,
        description: true,
      },
    });
    if (!breakTime) {
      throw new InternalServerErrorException('Break time not created');
    }
    return ResponseHelper.success({
      message: 'Break time created successfully',
      data: breakTime,
    });
  }

  async getBreakTimes(garage_id: string, schedule_id: string, user_id: string) {
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
    const breakTimes = await this.prisma.breakTime.findMany({
      where: {
        schedule_id: schedule.id,
      },
      select: {
        id: true,
        starts_at: true,
        ends_at: true,
        description: true,
      },
    });
    if (!breakTimes) {
      throw new InternalServerErrorException('Break times not found');
    }
    return ResponseHelper.success({
      message: 'Break times fetched successfully',
      data: breakTimes,
    });
  }

  async deleteBreakTime(
    break_time_id: string,
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
    const breakTime = await this.prisma.breakTime.delete({
      where: {
        id: break_time_id,
        schedule_id: schedule.id,
      },
      select: {
        id: true,
        starts_at: true,
        ends_at: true,
        description: true,
      },
    });
    if (!breakTime) {
      throw new InternalServerErrorException('Break time not deleted');
    }
    return ResponseHelper.success({
      message: 'Break time deleted successfully',
      data: breakTime,
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
}

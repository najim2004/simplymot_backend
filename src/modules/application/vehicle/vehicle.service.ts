import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AddVehicleDto } from './dto/create-vehicle.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { VehicleRepository } from 'src/common/repository/vehicle/vehicle.repository';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { QueryMotHistoryDto } from './dto/query-vehicle.dto';
import { Prisma } from 'prisma/generated/client';
@Injectable()
export class VehicleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  private normalizeRegistrationNumber(registration_number: string) {
    return registration_number.replace(/\s/g, '').toUpperCase();
  }

  async addVehicle(addVehicleDto: AddVehicleDto, user_id: string) {
    const { registration_number } = addVehicleDto;
    const normalizedRegistrationNumber =
      this.normalizeRegistrationNumber(registration_number);

    const existOwnerVehicle = await this.prisma.vehicle.findFirst({
      where: {
        registration_number: normalizedRegistrationNumber,
      },
    });

    if (existOwnerVehicle && existOwnerVehicle.user_id) {
      throw new ConflictException(
        `This vehicle-(${normalizedRegistrationNumber}) is already have an owner`,
      );
    } else if (existOwnerVehicle && !existOwnerVehicle.user_id) {
      await this.prisma.vehicle.update({
        where: {
          id: existOwnerVehicle.id,
        },
        data: {
          user_id,
        },
      });

      if (
        this.vehicleRepository.shouldRefreshMotData(
          existOwnerVehicle?.mot_last_checked_at,
        )
      ) {
        await this.vehicleRepository.refreshVehicleDataFromDvla(
          existOwnerVehicle,
        );
      }
      return ResponseHelper.success({
        data: existOwnerVehicle,
        message: 'Vehicle added successfully',
      });
    } else if (!existOwnerVehicle) {
      const newVehicle = await this.prisma.vehicle.create({
        data: {
          registration_number: normalizedRegistrationNumber,
          user_id,
        },
      });
      return ResponseHelper.success({
        data: newVehicle,
        message: 'Vehicle added successfully',
      });
    } else {
      throw new InternalServerErrorException('Failed to add vehicle');
    }
  }

  async getAllVehicles(user_id: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        user_id,
      },
      orderBy: {
        created_at: 'desc',
      },
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
        reminder_last_sent_at: true,
        year_of_manufacture: true,
      },
    });

    return ResponseHelper.success({
      data: vehicles,
      message: 'Vehicles fetched successfully',
    });
  }

  async deleteVehicle(vehicle_id: string, user_id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: {
        id: vehicle_id,
        user_id,
      },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    const deletedVehicle = await this.prisma.vehicle.update({
      where: {
        id: vehicle_id,
      },
      data: {
        user_id: null,
      },
    });
    if (!deletedVehicle) {
      throw new InternalServerErrorException('Failed to delete vehicle');
    }
    return ResponseHelper.success({
      data: deletedVehicle,
      message: 'Vehicle deleted successfully',
    });
  }

  async getAllMothHistoryOfAVehicle(
    vehicle_id: string,
    queryMotHistoryDto: QueryMotHistoryDto,
    user_id: string,
  ) {
    const { page, limit, search, date_from, date_to } = queryMotHistoryDto;
    const skip = (page - 1) * limit;
    const take = limit;
    const whereClause: Prisma.MotHistoryWhereInput = {
      vehicle_id,
      vehicle: {
        user_id,
      },
    };
    if (search) {
      whereClause.test_number = {
        contains: search,
        mode: 'insensitive',
      } satisfies Prisma.StringFilter;
    }
    if (date_from) {
      whereClause.test_date = {
        gte: date_from,
      } satisfies Prisma.DateTimeFilter;
    }
    if (date_to) {
      whereClause.test_date = {
        lte: date_to,
      } satisfies Prisma.DateTimeFilter;
    }
    const motHistory = await this.prisma.motHistory.findMany({
      where: whereClause,
      orderBy: {
        test_date: 'desc',
      },
      skip,
      take,
      select: {
        id: true,
        test_date: true,
        status: true,
        odometer_value: true,
        odometer_unit: true,
        odometer_result_type: true,
        data_source: true,
        registration_at_test: true,
        // defects: {
        //   select: {
        //     id: true,
        //     type: true,
        //   },
        // },
      },
    });
    const total = await this.prisma.motHistory.count({
      where: whereClause,
    });
    return ResponseHelper.success({
      data: motHistory,
      message: 'Moth history fetched successfully',
      meta_data: {
        total,
        page,
        limit,
        search,
        filters: {
          date_from,
          date_to,
        },
      },
    });
  }
}

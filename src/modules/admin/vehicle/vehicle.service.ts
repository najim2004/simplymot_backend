import { Injectable } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import {
  QueryVehicleDto,
  QueryVehicleHistoryDto,
  VehicleExpiryStatus,
  VehicleSortBy,
} from './dto/query-vehicle.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { Prisma } from 'prisma/generated/client';

@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllVehicles(queryVehicleDto: QueryVehicleDto) {
    const page = Math.max(1, Number(queryVehicleDto?.page) || 1);
    const limit = Math.max(
      1,
      Math.min(100, Number(queryVehicleDto?.limit) || 10),
    );
    const search = queryVehicleDto?.search?.trim();
    const expiryStatus = queryVehicleDto?.expiry_status;
    const sortBy = queryVehicleDto?.sort_by ?? VehicleSortBy.EXPIRY_SOON;
    const fromDate = queryVehicleDto?.from_date
      ? new Date(queryVehicleDto.from_date)
      : undefined;
    const toDate = queryVehicleDto?.to_date
      ? new Date(queryVehicleDto.to_date)
      : undefined;
    const offset = (page - 1) * limit;
    const now = new Date();

    const params: any[] = [];
    const filters: string[] = ['u."type" = $1', 'u."deleted_at" IS NULL'];
    params.push('DRIVER');

    const nextParam = (value: any) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (search) {
      const likeParam = nextParam(`%${search}%`);
      const searchFilters: string[] = [
        `u."name" ILIKE ${likeParam}`,
        `u."email" ILIKE ${likeParam}`,
        `u."phone_number" ILIKE ${likeParam}`,
        `u."address" ILIKE ${likeParam}`,
        `u."city" ILIKE ${likeParam}`,
        `u."state" ILIKE ${likeParam}`,
        `u."country" ILIKE ${likeParam}`,
        `u."zip_code" ILIKE ${likeParam}`,
        `v."registration_number" ILIKE ${likeParam}`,
        `v."make" ILIKE ${likeParam}`,
        `v."model" ILIKE ${likeParam}`,
        `v."color" ILIKE ${likeParam}`,
        `v."fuel_type" ILIKE ${likeParam}`,
      ];

      const numericSearch = Number(search);
      if (!Number.isNaN(numericSearch)) {
        const numericParam = nextParam(numericSearch);
        searchFilters.push(
          `v."year_of_manufacture" = ${numericParam}`,
          `v."engine_capacity" = ${numericParam}`,
          `v."co2_emissions" = ${numericParam}`,
        );
      }

      filters.push(`(${searchFilters.join(' OR ')})`);
    }

    if (expiryStatus === VehicleExpiryStatus.EXPIRED) {
      filters.push(`v."is_expired" = true`);
    } else if (expiryStatus === VehicleExpiryStatus.EXPIRED_SOON) {
      const nowParam = nextParam(now);
      const soonParam = nextParam(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      );
      filters.push(`v."is_expired" = false`);
      filters.push(`v."mot_expiry_date" IS NOT NULL`);
      filters.push(`v."mot_expiry_date" >= ${nowParam}`);
      filters.push(`v."mot_expiry_date" <= ${soonParam}`);
    } else if (expiryStatus === VehicleExpiryStatus.NOT_EXPIRED) {
      const nowParam = nextParam(now);
      filters.push(`v."is_expired" = false`);
      filters.push(`v."mot_expiry_date" IS NOT NULL`);
      filters.push(`v."mot_expiry_date" >= ${nowParam}`);
    }

    if (fromDate && toDate) {
      const fromDateParam = nextParam(fromDate);
      const inclusiveToDate = new Date(toDate);
      inclusiveToDate.setHours(23, 59, 59, 999);
      const toDateParam = nextParam(inclusiveToDate);
      filters.push(`v."mot_expiry_date" IS NOT NULL`);
      filters.push(`v."mot_expiry_date" >= ${fromDateParam}`);
      filters.push(`v."mot_expiry_date" <= ${toDateParam}`);
    } else if (fromDate) {
      const fromDateParam = nextParam(fromDate);
      filters.push(`v."mot_expiry_date" IS NOT NULL`);
      filters.push(`v."mot_expiry_date" >= ${fromDateParam}`);
    } else if (toDate) {
      const inclusiveToDate = new Date(toDate);
      inclusiveToDate.setHours(23, 59, 59, 999);
      const toDateParam = nextParam(inclusiveToDate);
      filters.push(`v."mot_expiry_date" IS NOT NULL`);
      filters.push(`v."mot_expiry_date" <= ${toDateParam}`);
    }

    let orderByClause = `v."created_at" DESC`;
    if (sortBy === VehicleSortBy.EXPIRY_SOON) {
      orderByClause = `v."mot_expiry_date" ASC NULLS LAST, v."created_at" DESC`;
    }

    const limitParam = nextParam(limit);
    const offsetParam = nextParam(offset);

    const query = `
      SELECT
        v."id",
        v."registration_number",
        v."mot_expiry_date",
        v."is_expired",
        u."id" AS "user_id",
        u."name" AS "user_name",
        u."email" AS "user_email",
        u."phone_number" AS "user_phone_number",
        COUNT(*) OVER()::int AS "total_count"
      FROM "Vehicle" v
      JOIN "User" u ON u."id" = v."user_id"
      WHERE ${filters.join(' AND ')}
      ORDER BY ${orderByClause}
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `;

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        registration_number: string;
        mot_expiry_date: Date | null;
        user_id: string | null;
        user_name: string | null;
        user_email: string | null;
        user_phone_number: string | null;
        total_count: number;
      }>
    >(query, ...params);

    const total = rows[0]?.total_count ?? 0;
    const vehicles = rows.map((row) => ({
      id: row.id,
      registration_number: row.registration_number,
      mot_expiry_date: row.mot_expiry_date,
      vehicle_owner_id: row.user_id,
      vehicle_owner_name: row.user_name,
      vehicle_owner_email: row.user_email,
      vehicle_owner_phone_number: row.user_phone_number,
    }));

    return ResponseHelper.success({
      data: vehicles,
      message: 'Vehicles fetched successfully',
      meta_data: {
        total,
        page,
        limit,
        search,
        filters: {
          expiry_status: expiryStatus,
          sort_by: sortBy,
          from_date: fromDate,
          to_date: toDate,
        },
      },
    });
  }
  async getVehicleById(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: {
        id,
      },
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
        raw_mot_data: true,
        raw_dvla_data: true,
        raw_mot_status: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
          },
        },
      },
    });
    const { user, ...rest } = vehicle;
    return ResponseHelper.success({
      data: {
        ...rest,
        vehicle_owner: user,
      },
      message: 'Vehicle fetched successfully',
    });
  }
  async getVehicleHistory(
    vehicle_id: string,
    queryVehicleHistoryDto: QueryVehicleHistoryDto,
  ) {
    const { page, limit, search } = queryVehicleHistoryDto;
    const skip = (page - 1) * limit;
    const take = limit;
    const whereClause: Prisma.MotHistoryWhereInput = {
      vehicle_id,
    };
    if (search) {
      whereClause.test_number = {
        contains: search,
        mode: 'insensitive',
      } satisfies Prisma.StringFilter;
    }
    const histories = await this.prisma.motHistory.findMany({
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
      },
    });
    const total = await this.prisma.motHistory.count({
      where: whereClause,
    });
    return ResponseHelper.success({
      data: histories,
      message: 'Vehicle history fetched successfully',
      meta_data: {
        total,
        page,
        limit,
        search,
      },
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryDriverDto } from './dto/query-driver.dto';
import { Prisma, UserAccountStatus, UserKind } from '@generated/prisma';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllDrivers(query: QueryDriverDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      from_date,
      to_date,
      startdate,
      enddate,
    } = query;

    const startDateFilter = from_date || startdate;
    const endDateFilter = to_date || enddate;

    const whereClause: Prisma.UserWhereInput = {
      kind: { in: [UserKind.DRIVER, UserKind.USER] },
      ...(status && { status: status }),
      ...(startDateFilter && { created_at: { gte: startDateFilter } }),
      ...(endDateFilter && { created_at: { lte: endDateFilter } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone_number: { contains: search, mode: 'insensitive' } },
          {
            vehicles: {
              some: {
                registration_number: { contains: search, mode: 'insensitive' },
              },
            },
          },
        ],
      }),
    };

    const drivers = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        phone_number: true,
        address: true,
        city: true,
        state: true,
        country: true,
        post_code: true,
        status: true,
        created_at: true,
        email_verified_at: true,
        approved_at: true,
        banned_at: true,
        _count: {
          select: {
            vehicles: true,
            bookings: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
    });

    const total = await this.prisma.user.count({ where: whereClause });

    const formattedDrivers = drivers.map((driver) => {
      const vehiclesCount = driver._count?.vehicles ?? 0;
      const bookingsCount = driver._count?.bookings ?? 0;
      return {
        id: driver.id,
        name: driver.name || 'Unnamed Driver',
        email: driver.email || 'N/A',
        phone_number: driver.phone_number || null,
        avatar: driver.avatar ? SojebStorage.url(driver.avatar) : null,
        address: driver.address || null,
        city: driver.city || null,
        state: driver.state || null,
        country: driver.country || null,
        post_code: driver.post_code || null,
        status: driver.status || UserAccountStatus.PENDING,
        created_at: driver.created_at,
        email_verified_at: driver.email_verified_at,
        approved_at: driver.approved_at,
        banned_at: driver.banned_at,
        vehicles_count: vehiclesCount,
        bookings_count: bookingsCount,
      };
    });

    return ResponseHelper.success({
      data: {
        drivers: formattedDrivers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
          pages: Math.ceil(total / limit) || 1,
        },
      },
      message: 'Drivers fetched successfully',
      meta_data: {
        total,
        page,
        limit,
        search,
        filters: {
          status,
          from_date: startDateFilter,
          to_date: endDateFilter,
        },
      },
    });
  }

  async getDriverDetails(id: string) {
    const driver = await this.prisma.user.findUnique({
      where: { id },
      include: {
        vehicles: {
          orderBy: { created_at: 'desc' },
          include: {
            mot_history: {
              orderBy: { test_date: 'desc' },
              include: {
                defects: true,
              },
            },
          },
        },
        bookings: {
          orderBy: { order_date: 'desc' },
          include: {
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
          },
        },
        _count: {
          select: {
            vehicles: true,
            bookings: true,
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const formattedVehicles = driver.vehicles.map((v) => ({
      ...v,
      mot_history: v.mot_history.map((h) => ({
        ...h,
        defects: h.defects || [],
      })),
    }));

    const formattedBookings = driver.bookings.map((b) => ({
      ...b,
      garage: b.garage
        ? {
            ...b.garage,
            garage_image: b.garage.garage_image
              ? SojebStorage.url(b.garage.garage_image)
              : null,
          }
        : null,
    }));

    const formattedDriver = {
      id: driver.id,
      name: driver.name || 'Unnamed Driver',
      email: driver.email || 'N/A',
      phone_number: driver.phone_number || null,
      avatar: driver.avatar ? SojebStorage.url(driver.avatar) : null,
      address: driver.address || null,
      city: driver.city || null,
      state: driver.state || null,
      country: driver.country || null,
      post_code: driver.post_code || null,
      status: driver.status,
      created_at: driver.created_at,
      email_verified_at: driver.email_verified_at,
      approved_at: driver.approved_at,
      banned_at: driver.banned_at,
      vehicles: formattedVehicles,
      bookings: formattedBookings,
      vehicles_count: driver._count?.vehicles ?? 0,
      bookings_count: driver._count?.bookings ?? 0,
    };

    return ResponseHelper.success({
      data: formattedDriver,
      message: 'Driver details fetched successfully',
    });
  }

  async banDriver(id: string) {
    const driver = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: UserAccountStatus.BANNED,
        banned_at: new Date(),
      },
      select: { id: true, status: true, banned_at: true },
    });

    return ResponseHelper.success({
      data: updated,
      message: 'Driver has been banned successfully',
    });
  }

  async unbanDriver(id: string) {
    const driver = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: UserAccountStatus.ACTIVE,
        banned_at: null,
      },
      select: { id: true, status: true, banned_at: true },
    });

    return ResponseHelper.success({
      data: updated,
      message: 'Driver has been unbanned successfully',
    });
  }

  async toggleBanDriver(id: string) {
    const driver = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.status === UserAccountStatus.BANNED) {
      return this.unbanDriver(id);
    } else {
      return this.banDriver(id);
    }
  }
}


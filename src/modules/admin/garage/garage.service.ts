import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryGarageDto } from './dto/query-garage.dto';
import { Prisma } from '@generated/prisma';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

@Injectable()
export class GarageService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllGarages(query: QueryGarageDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      from_date,
      to_date,
      is_visible,
    } = query;
    const whereClause: Prisma.GarageWhereInput = {
      ...(search && {
        OR: [
          { garage_name: { contains: search, mode: 'insensitive' } },
          { contact_email: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { phone_number: { contains: search, mode: 'insensitive' } },
          { vts_number: { contains: search, mode: 'insensitive' } },
          { owner: { name: { contains: search, mode: 'insensitive' } } },
          { owner: { email: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(status && { owner: { status: status } }),
      ...(is_visible !== undefined && { is_visible: is_visible }),
      ...(from_date && { created_at: { gte: from_date } }),
      ...(to_date && { created_at: { lte: to_date } }),
    };
    const garages = await this.prisma.garage.findMany({
      where: whereClause,
      select: {
        id: true,
        garage_name: true,
        garage_image: true,
        phone_number: true,
        contact_email: true,
        vts_number: true,
        address: true,
        city: true,
        state: true,
        country: true,
        post_code: true,
        is_visible: true,
        created_at: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            avatar: true,
            status: true,
            created_at: true,
            subscriptions: {
              take: 1,
              orderBy: { created_at: 'desc' },
              select: {
                id: true,
                status: true,
                plan: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
    });
    const total = await this.prisma.garage.count({ where: whereClause });
    const formattedGarages = garages.map((garage) => {
      const owner = garage.owner;
      const latestSub = owner?.subscriptions?.[0];
      return {
        id: garage.id,
        garage_name: garage.garage_name,
        garage_image: garage.garage_image ? SojebStorage.url(garage.garage_image) : null,
        phone_number: garage.phone_number,
        contact_email: garage.contact_email,
        vts_number: garage.vts_number,
        address: garage.address,
        city: garage.city,
        state: garage.state,
        country: garage.country,
        post_code: garage.post_code,
        is_visible: garage.is_visible,
        garage_status: garage.is_visible ? 'Visible' : 'Hidden',
        created_at: garage.created_at,
        owner_id: owner?.id,
        owner_name: owner?.name,
        owner_email: owner?.email,
        owner_phone: owner?.phone_number,
        owner_avatar: owner?.avatar ? SojebStorage.url(owner.avatar) : null,
        owner_status: owner?.status || 'PENDING',
        status: owner?.status || 'PENDING',
        subscription_status: latestSub?.status || 'NO_SUBSCRIPTION',
        subscription_plan: latestSub?.plan?.name || null,
        owner: owner
          ? {
              ...owner,
              avatar: owner.avatar ? SojebStorage.url(owner.avatar) : null,
            }
          : null,
      };
    });
    return ResponseHelper.success({
      data: formattedGarages,
      message: 'Garages fetched successfully',
      meta_data: {
        total,
        page,
        limit,
        search,
        filters: {
          status,
          from_date,
          to_date,
        },
      },
    });
  }

  async getGarageDetails(id: string) {
    const garage = await this.prisma.garage.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            status: true,
            name: true,
            email: true,
            phone_number: true,
            avatar: true,
            created_at: true,
            email_verified_at: true,
            address: true,
            city: true,
            state: true,
            country: true,
            post_code: true,
            subscriptions: {
              orderBy: { created_at: 'desc' },
              include: {
                plan: true,
              },
            },
          },
        },
        services: {
          orderBy: { created_at: 'desc' },
        },
        schedule: {
          include: {
            schedule_intervals: {
              include: {
                break_times: true,
              },
            },
            holidays: {
              orderBy: { date: 'asc' },
            },
          },
        },
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }

    const activityLogs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { garage_id: id },
          { record_id: id },
          ...(garage.owner_id ? [{ actor_id: garage.owner_id }, { record_id: garage.owner_id }] : []),
        ],
      },
      orderBy: { created_at: 'desc' },
      take: 30,
    });

    const formattedGarage = {
      ...garage,
      garage_image: garage.garage_image ? SojebStorage.url(garage.garage_image) : null,
      owner: garage.owner
        ? {
            ...garage.owner,
            avatar: garage.owner.avatar ? SojebStorage.url(garage.owner.avatar) : null,
          }
        : null,
      activity_logs: activityLogs,
    };
    return ResponseHelper.success({
      data: formattedGarage,
      message: 'Garage details fetched successfully',
    });
  }

  async toggleGarageVisibility(id: string, is_visible?: boolean) {
    const garage = await this.prisma.garage.findUnique({
      where: { id },
      select: { id: true, is_visible: true, garage_name: true },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }
    const newVisibility =
      is_visible !== undefined ? Boolean(is_visible) : !garage.is_visible;
    const updated = await this.prisma.garage.update({
      where: { id },
      data: { is_visible: newVisibility },
      select: { id: true, is_visible: true, garage_name: true },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          table_name: 'Garage',
          record_id: id,
          action: 'UPDATE',
          actor_type: 'admin',
          garage_id: id,
          old_values: { is_visible: garage.is_visible },
          new_values: { is_visible: updated.is_visible },
          changes: { is_visible: `Changed to ${updated.is_visible ? 'Visible' : 'Hidden'}` },
        },
      });
    } catch {
      // non-blocking
    }

    return ResponseHelper.success({
      data: updated,
      message: `Garage is now ${updated.is_visible ? 'visible' : 'hidden'}`,
    });
  }
}

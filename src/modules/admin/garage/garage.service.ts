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
    const { page, limit = 10, search, status, from_date, to_date } = query;
    const whereClause: Prisma.GarageWhereInput = {
      ...(search && { garage_name: { contains: search, mode: 'insensitive' } }),
      ...(search && { email: { contains: search, mode: 'insensitive' } }),
      ...(search && { address: { contains: search, mode: 'insensitive' } }),
      ...(search && {
        phone_number: { contains: search, mode: 'insensitive' },
      }),
      ...(search && {
        contact_email: { contains: search, mode: 'insensitive' },
      }),
      ...(search && { vts_number: { contains: search, mode: 'insensitive' } }),
      ...(search && {
        owner: { name: { contains: search, mode: 'insensitive' } },
      }),
      ...(search && {
        owner: { email: { contains: search, mode: 'insensitive' } },
      }),
      ...(status && { owner: { status: status } }),
      ...(from_date && { created_at: { gte: from_date } }),
      ...(to_date && { created_at: { lte: to_date } }),
    };
    const garages = await this.prisma.garage.findMany({
      where: whereClause,
      select: {
        id: true,
        garage_name: true,
        phone_number: true,
        contact_email: true,
        vts_number: true,
        created_at: true,
        owner: {
          select: {
            status: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
    });
    const total = await this.prisma.garage.count({ where: whereClause });
    const formattedGarages = garages.map((garage) => {
      const status = garage.owner.status;
      delete garage.owner;
      return {
        ...garage,
        status,
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
      select: {
        id: true,
        garage_name: true,
        phone_number: true,
        contact_email: true,
        garage_image: true,
        vts_number: true,
        created_at: true,
        address: true,
        owner: {
          select: {
            status: true,
            name: true,
            email: true,
            phone_number: true,
            avatar: true,
          },
        },
      },
    });
    if (!garage) {
      throw new NotFoundException('Garage not found');
    }
    const formattedGarage = {
      ...garage,
      garage_image: SojebStorage.url(garage.garage_image),
      owner: {
        ...garage.owner,
        avatar: SojebStorage.url(garage.owner.avatar),
      },
    };
    return ResponseHelper.success({
      data: formattedGarage,
      message: 'Garage details fetched successfully',
    });
  }
}

import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AddVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}
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
        !existOwnerVehicle?.mot_last_checked_at ||
        new Date().getTime() -
          new Date(existOwnerVehicle.mot_last_checked_at).getTime() >
          24 * 60 * 60 * 1000
      ) {
        // TODO
      }
    }
  }

  findAll() {
    return `This action returns all vehicle`;
  }

  findOne(id: number) {
    return `This action returns a #${id} vehicle`;
  }

  update(id: number, updateVehicleDto: UpdateVehicleDto) {
    return `This action updates a #${id} vehicle`;
  }

  remove(id: number) {
    return `This action removes a #${id} vehicle`;
  }
}

import { Injectable } from '@nestjs/common';
import { CreatePublicContactDto } from './dto/create-contact.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async create(createContactDto: CreatePublicContactDto, userId?: string) {
    try {
      const data: Record<string, any> = {};

      if (userId) {
        data['user_id'] = userId;
      }
      if (createContactDto.name) {
        data['name'] = createContactDto.name;
      }
      if (createContactDto.garage_name) {
        data['garage_name'] = createContactDto.garage_name;
      }
      if (createContactDto.primary_contact) {
        data['primary_contact'] = createContactDto.primary_contact;
      }
      if (createContactDto.email) {
        data['email'] = createContactDto.email;
      }
      if (createContactDto.phone_number) {
        data['phone_number'] = createContactDto.phone_number;
      }
      if (createContactDto.message) {
        data['message'] = createContactDto.message;
      }
      if (createContactDto.source) {
        data['source'] = createContactDto.source;
      }
      if (createContactDto.first_name) {
        data['first_name'] = createContactDto.first_name;
      }
      if (createContactDto.last_name) {
        data['last_name'] = createContactDto.last_name;
      }

      await this.prisma.contact.create({
        data,
      });

      return {
        success: true,
        message: 'Submitted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

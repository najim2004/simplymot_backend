import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  CreateAdminContactResponseDto,
  DeleteAdminContactResponseDto,
  GetAdminContactResponseDto,
  ListAdminContactsResponseDto,
  UpdateAdminContactResponseDto,
} from './dto/swagger/contact-api.dto';

@ApiBearerAuth()
@ApiTags('Admin Contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @apiTypedDoc(
    {
      summary: 'Create contact',
      description:
        'ADMIN + JWT. Body: `first_name`, `last_name`, `email`, `phone_number`, `message`.',
    },
    { type: CreateAdminContactResponseDto, status: HttpStatus.CREATED },
  )
  @Post()
  async create(@Body() createContactDto: CreateContactDto) {
    try {
      const contact = await this.contactService.create(createContactDto);
      return contact;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @apiTypedDoc(
    {
      summary: 'List contacts',
      description: 'ADMIN + JWT.',
    },
    { type: ListAdminContactsResponseDto },
  )
  @Get()
  async findAll(@Query() query: { q?: string; status?: number }) {
    try {
      const searchQuery = query.q;
      const status = query.status;

      const contacts = await this.contactService.findAll({
        q: searchQuery,
        status: status,
      });
      return contacts;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @apiTypedDoc(
    {
      summary: 'Get contact',
      description: 'ADMIN + JWT.',
    },
    { type: GetAdminContactResponseDto },
  )
  @Get(':contact_id')
  async findOne(@Param('contact_id') contact_id: string) {
    try {
      const contact = await this.contactService.findOne(contact_id);
      return contact;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @apiTypedDoc(
    {
      summary: 'Update contact',
      description: 'ADMIN + JWT.',
    },
    { type: UpdateAdminContactResponseDto },
  )
  @Patch(':contact_id')
  async update(
    @Param('contact_id') contact_id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    try {
      const contact = await this.contactService.update(
        contact_id,
        updateContactDto,
      );
      return contact;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @apiTypedDoc(
    {
      summary: 'Delete contact',
      description: 'ADMIN + JWT.',
    },
    { type: DeleteAdminContactResponseDto },
  )
  @Delete(':contact_id')
  async remove(@Param('contact_id') contact_id: string) {
    try {
      const contact = await this.contactService.remove(contact_id);
      return contact;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

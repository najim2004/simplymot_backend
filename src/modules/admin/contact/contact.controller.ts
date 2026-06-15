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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';
const CONTACT_EXAMPLE = {
  id: 'clcontact001',
  name: 'John Driver',
  email: 'john@example.com',
  subject: 'Support request',
  message: 'I need help with my booking',
  status: 1,
  created_at: '2026-06-14T10:00:00.000Z',
  updated_at: '2026-06-14T10:00:00.000Z',
};

@ApiBearerAuth()
@ApiTags('Admin Contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @ApiOperation({
    summary: 'Create contact',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Contact created successfully',
    status: HttpStatus.CREATED,
    data: CONTACT_EXAMPLE,
  })
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

  @ApiOperation({
    summary: 'List contacts',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Contacts fetched successfully',
    data: [CONTACT_EXAMPLE],
  })
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

  @ApiOperation({
    summary: 'Get contact',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Contact fetched successfully',
    data: CONTACT_EXAMPLE,
  })
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

  @ApiOperation({
    summary: 'Update contact',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Contact updated successfully',
    data: CONTACT_EXAMPLE,
  })
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

  @ApiOperation({
    summary: 'Delete contact',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Contact deleted successfully',
    data: { id: 'clcontact001' },
  })
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

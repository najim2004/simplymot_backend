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

@ApiBearerAuth()
@ApiTags('Contact')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @ApiOperation({ summary: 'Create contact' })
  @ApiSuccessResponse({
    summary: 'Create contact',
    message: 'Contact created successfully',
    status: HttpStatus.CREATED,
    data: { id: 'contact_id' },
    includeAuthErrors: true,
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

  @ApiOperation({ summary: 'Read all contacts' })
  @ApiSuccessResponse({
    summary: 'Read all contacts',
    message: 'Contacts fetched successfully',
    data: [],
    includeAuthErrors: true,
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

  @ApiOperation({ summary: 'Read one contact' })
  @ApiSuccessResponse({
    summary: 'Read one contact',
    message: 'Contact fetched successfully',
    data: { id: 'contact_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const contact = await this.contactService.findOne(id);
      return contact;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Update contact' })
  @ApiSuccessResponse({
    summary: 'Update contact',
    message: 'Contact updated successfully',
    data: { id: 'contact_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    try {
      const contact = await this.contactService.update(id, updateContactDto);
      return contact;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Delete contact' })
  @ApiSuccessResponse({
    summary: 'Delete contact',
    message: 'Contact deleted successfully',
    data: { id: 'contact_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const contact = await this.contactService.remove(id);
      return contact;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

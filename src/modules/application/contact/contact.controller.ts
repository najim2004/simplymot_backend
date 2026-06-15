import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';
@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @ApiOperation({
    summary: 'Submit contact form',
    description: 'Public. Body: `name`, `email`, `subject`, `message`.',
  })
  @ApiSuccessResponse({
    message: 'Contact created successfully',
    status: HttpStatus.CREATED,
    data: {
      id: 'clcontact001',
      name: 'John Driver',
      email: 'john@example.com',
      subject: 'Support request',
      message: 'I need help with my booking',
      created_at: '2026-06-14T10:00:00.000Z',
    },
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
}

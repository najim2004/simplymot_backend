import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreatePublicContactDto } from './dto/create-contact.dto';
import { ApiTags } from '@nestjs/swagger';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import { CreateContactResponseDto } from './dto/swagger/contact-api.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @apiTypedDoc(
    {
      summary: 'Submit contact form',
      description:
        'Public. Body: `first_name`, `last_name`, `email`, `phone_number`, `message`.',
    },
    { type: CreateContactResponseDto, status: HttpStatus.CREATED },
  )
  @Post()
  async create(@Body() createContactDto: CreatePublicContactDto) {
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

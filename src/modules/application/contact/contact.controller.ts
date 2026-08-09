import { Controller, Post, Body, HttpStatus, UseGuards } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreatePublicContactDto } from './dto/create-contact.dto';
import { ApiTags } from '@nestjs/swagger';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import { CreateContactResponseDto } from './dto/swagger/contact-api.dto';
import { OptionalJwtAuthGuard } from 'src/modules/auth/guards/optional-jwt-auth.guard';
import { User } from 'src/modules/auth/decorators/get-user.decorator';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @apiTypedDoc(
    {
      summary: 'Submit contact form',
      description:
        'Public (JWT optional). Body: `name`, `garage_name`, `primary_contact`, `email`, `phone_number`, `message`, `source`.',
    },
    { type: CreateContactResponseDto, status: HttpStatus.CREATED },
  )
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async create(
    @Body() createContactDto: CreatePublicContactDto,
    @User('id') userId?: string,
  ) {
    try {
      const contact = await this.contactService.create(
        createContactDto,
        userId,
      );
      return contact;
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

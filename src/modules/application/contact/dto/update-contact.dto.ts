import { PartialType } from '@nestjs/swagger';
import { CreatePublicContactDto } from './create-contact.dto';

export class UpdatePublicContactDto extends PartialType(
  CreatePublicContactDto,
) {}

import { PartialType } from '@nestjs/swagger';
import { CreateAdminContactDto } from './create-contact.dto';

export class UpdateAdminContactDto extends PartialType(CreateAdminContactDto) {}

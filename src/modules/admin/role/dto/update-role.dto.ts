import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/** All fields optional; same validation rules as {@link CreateRoleDto} when provided. */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { AbilitiesGuard } from '../../../ability/abilities.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { CheckAbilities } from '../../../ability/abilities.decorator';
import { Action } from '../../../ability/ability.factory';
import { RoleService } from './role.service';
import { ListPermissionsResponseDto } from './dto/swagger/role-api.dto';
import { apiTypedDoc } from 'src/common/swagger/api-doc';

@ApiTags('Admin Permissions')
@Controller('admin/permissions')
@UseGuards(JwtAuthGuard, RolesGuard, AbilitiesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class PermissionController {
  constructor(private readonly roleService: RoleService) {}

  @apiTypedDoc(
    {
      summary: 'List all permissions',
      description:
        'Returns every active permission (id, title, action, subject) for admin UIs and policy editors.',
    },
    { type: ListPermissionsResponseDto },
  )
  @Get()
  @CheckAbilities({ action: Action.Read, subject: 'Role' })
  listPermissions(): Promise<ListPermissionsResponseDto> {
    return this.roleService.listPermissions();
  }
}

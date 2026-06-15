import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { AbilitiesGuard } from '../../../ability/abilities.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { CheckAbilities } from '../../../ability/abilities.decorator';
import { Action } from '../../../ability/ability.factory';
import { RoleService } from './role.service';
import { ListPermissionsResponseDto } from './dto/swagger/role-api.dto';

@ApiTags('Admin Permissions')
@Controller('admin/permissions')
@UseGuards(JwtAuthGuard, RolesGuard, AbilitiesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class PermissionController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({
    summary: 'List all permissions',
    description:
      'Returns every active permission (id, title, action, subject) for admin UIs and policy editors.',
  })
  @ApiOkResponse({ type: ListPermissionsResponseDto })
  @CheckAbilities({ action: Action.Read, subject: 'Role' })
  listPermissions(): Promise<ListPermissionsResponseDto> {
    return this.roleService.listPermissions();
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { AbilitiesGuard } from '../../../ability/abilities.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { CheckAbilities } from '../../../ability/abilities.decorator';
import { Action } from '../../../ability/ability.factory';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import {
  CreateRoleResponseDto,
  DeleteRoleResponseDto,
  ListPermissionsResponseDto,
  ListRolesResponseDto,
  RoleDetailResponseDto,
  RoleStatisticsResponseDto,
  SetRolePermissionsResponseDto,
  UpdateRoleResponseDto,
} from './dto/swagger/role-api.dto';
import { apiTypedDoc } from 'src/common/swagger/api-doc';

@ApiTags('Admin Roles')
@Controller('admin/roles')
@UseGuards(JwtAuthGuard, RolesGuard, AbilitiesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: '1-based page index',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
    description: 'Page size',
  })
  @apiTypedDoc(
    {
      summary: 'Paginated list of roles',
      description:
        'Returns non-deleted roles with permission counts. Use for admin tables.',
    },
    { type: ListRolesResponseDto },
  )
  @Get()
  @CheckAbilities({ action: Action.Read, subject: 'Role' })
  async listRoles(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<ListRolesResponseDto> {
    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    if (isNaN(p) || isNaN(l) || p < 1 || l < 1) {
      throw new BadRequestException('Invalid page or limit parameters');
    }
    return this.roleService.listRoles(p, l);
  }

  @apiTypedDoc(
    {
      summary: 'List permissions (alias)',
      description:
        'Same payload as `GET /admin/permissions`. Kept for backward compatibility.',
    },
    { type: ListPermissionsResponseDto },
  )
  @Get('permissions')
  @CheckAbilities({ action: Action.Read, subject: 'Role' })
  async listPermissions(): Promise<ListPermissionsResponseDto> {
    return this.roleService.listPermissions();
  }

  @apiTypedDoc(
    {
      summary: 'Role & permission usage statistics',
      description:
        'Aggregates role counts, user counts, and per-role assignment stats.',
    },
    { type: RoleStatisticsResponseDto },
  )
  @Get('statistics')
  @CheckAbilities({ action: Action.Read, subject: 'Role' })
  async getRoleStatistics(): Promise<RoleStatisticsResponseDto> {
    return this.roleService.getRoleStatistics();
  }

  @ApiParam({
    name: 'role_id',
    description: 'Role id (cuid)',
    example: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @apiTypedDoc(
    {
      summary: 'Get one role with permissions',
    },
    { type: RoleDetailResponseDto },
  )
  @Get(':role_id')
  @CheckAbilities({ action: Action.Show, subject: 'Role' })
  async getRole(
    @Param('role_id') role_id: string,
  ): Promise<RoleDetailResponseDto> {
    return this.roleService.getRole(role_id);
  }

  @apiTypedDoc(
    { summary: 'Create a custom role' },
    { type: CreateRoleResponseDto, status: HttpStatus.CREATED },
  )
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @CheckAbilities({ action: Action.Create, subject: 'Role' })
  async createRole(@Body() dto: CreateRoleDto): Promise<CreateRoleResponseDto> {
    return this.roleService.createRole(dto);
  }

  @ApiParam({ name: 'role_id', description: 'Role id (cuid)' })
  @apiTypedDoc(
    { summary: 'Update role title or slug' },
    { type: UpdateRoleResponseDto },
  )
  @Put(':role_id')
  @CheckAbilities({ action: Action.Update, subject: 'Role' })
  async updateRole(
    @Param('role_id') role_id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<UpdateRoleResponseDto> {
    return this.roleService.updateRole(role_id, dto);
  }

  @ApiParam({ name: 'role_id', description: 'Role id (cuid)' })
  @apiTypedDoc(
    {
      summary: 'Soft-delete a role',
      description:
        'Fails if the role is assigned to users or is a protected system role.',
    },
    { type: DeleteRoleResponseDto },
  )
  @Delete(':role_id')
  @CheckAbilities({ action: Action.Delete, subject: 'Role' })
  async deleteRole(
    @Param('role_id') role_id: string,
  ): Promise<DeleteRoleResponseDto> {
    return this.roleService.deleteRole(role_id);
  }

  @ApiParam({ name: 'role_id', description: 'Role id (cuid)' })
  @apiTypedDoc(
    {
      summary: 'Assign, replace, or remove permissions on a role',
      description:
        'System tenant permissions can only be linked to the `su_admin` role.',
    },
    { type: SetRolePermissionsResponseDto },
  )
  @Post(':role_id/permissions')
  @CheckAbilities({ action: Action.Update, subject: 'Role' })
  async setRolePermissions(
    @Param('role_id') role_id: string,
    @Body() dto: SetRolePermissionsDto,
  ): Promise<SetRolePermissionsResponseDto> {
    return this.roleService.setRolePermissions(role_id, dto);
  }
}

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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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

@ApiTags('Admin Roles')
@Controller('admin/roles')
@UseGuards(JwtAuthGuard, RolesGuard, AbilitiesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
@ApiForbiddenResponse({
  description: 'Not an admin or missing required CASL ability on Role',
})
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({
    summary: 'Paginated list of roles',
    description:
      'Returns non-deleted roles with permission counts. Use for admin tables.',
  })
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
  @ApiOkResponse({ type: ListRolesResponseDto })
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

  @Get('permissions')
  @ApiOperation({
    summary: 'List permissions (alias)',
    description:
      'Same payload as `GET /admin/permissions`. Kept for backward compatibility.',
  })
  @ApiOkResponse({ type: ListPermissionsResponseDto })
  @CheckAbilities({ action: Action.Read, subject: 'Role' })
  async listPermissions(): Promise<ListPermissionsResponseDto> {
    return this.roleService.listPermissions();
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Role & permission usage statistics',
    description:
      'Aggregates role counts, user counts, and per-role assignment stats.',
  })
  @ApiOkResponse({ type: RoleStatisticsResponseDto })
  @CheckAbilities({ action: Action.Read, subject: 'Role' })
  async getRoleStatistics(): Promise<RoleStatisticsResponseDto> {
    return this.roleService.getRoleStatistics();
  }

  @Get(':role_id')
  @ApiOperation({
    summary: 'Get one role with permissions',
  })
  @ApiParam({
    name: 'role_id',
    description: 'Role id (cuid)',
    example: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Role not found or soft-deleted' })
  @CheckAbilities({ action: Action.Show, subject: 'Role' })
  async getRole(
    @Param('role_id') role_id: string,
  ): Promise<RoleDetailResponseDto> {
    return this.roleService.getRole(role_id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiCreatedResponse({ type: CreateRoleResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation error, reserved name, or duplicate slug',
  })
  @CheckAbilities({ action: Action.Create, subject: 'Role' })
  async createRole(@Body() dto: CreateRoleDto): Promise<CreateRoleResponseDto> {
    return this.roleService.createRole(dto);
  }

  @Put(':role_id')
  @ApiOperation({ summary: 'Update role title or slug' })
  @ApiParam({ name: 'role_id', description: 'Role id (cuid)' })
  @ApiOkResponse({ type: UpdateRoleResponseDto })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiBadRequestResponse({
    description: 'Validation or business rule violation',
  })
  @CheckAbilities({ action: Action.Update, subject: 'Role' })
  async updateRole(
    @Param('role_id') role_id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<UpdateRoleResponseDto> {
    return this.roleService.updateRole(role_id, dto);
  }

  @Delete(':role_id')
  @ApiOperation({
    summary: 'Soft-delete a role',
    description:
      'Fails if the role is assigned to users or is a protected system role.',
  })
  @ApiParam({ name: 'role_id', description: 'Role id (cuid)' })
  @ApiOkResponse({ type: DeleteRoleResponseDto })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiBadRequestResponse({
    description: 'Protected role, still assigned, or constraint error',
  })
  @CheckAbilities({ action: Action.Delete, subject: 'Role' })
  async deleteRole(
    @Param('role_id') role_id: string,
  ): Promise<DeleteRoleResponseDto> {
    return this.roleService.deleteRole(role_id);
  }

  @Post(':role_id/permissions')
  @ApiOperation({
    summary: 'Assign, replace, or remove permissions on a role',
    description:
      'System tenant permissions can only be linked to the `su_admin` role.',
  })
  @ApiParam({ name: 'role_id', description: 'Role id (cuid)' })
  @ApiOkResponse({ type: SetRolePermissionsResponseDto })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiBadRequestResponse({
    description: 'Invalid permission ids, mode, or policy violation',
  })
  @CheckAbilities({ action: Action.Update, subject: 'Role' })
  async setRolePermissions(
    @Param('role_id') role_id: string,
    @Body() dto: SetRolePermissionsDto,
  ): Promise<SetRolePermissionsResponseDto> {
    return this.roleService.setRolePermissions(role_id, dto);
  }
}

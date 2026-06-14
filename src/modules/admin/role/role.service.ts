import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { SetRolePermissionsMode } from './dto/set-role-permissions-mode.enum';
import { IMMUTABLE_ROLE_SLUGS, RESERVED_ROLE_SLUGS } from './role.constants';

const roleListSelect = {
  id: true,
  title: true,
  name: true,
  created_at: true,
  updated_at: true,
  permission_roles: {
    select: { permission_id: true },
  },
} satisfies Prisma.RoleSelect;

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  private activeRoleWhere(): Prisma.RoleWhereInput {
    return { deleted_at: null };
  }

  private activePermissionWhere(): Prisma.PermissionWhereInput {
    return { deleted_at: null };
  }

  async listRoles(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = this.activeRoleWhere();

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: roleListSelect,
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      success: true,
      data: {
        roles: roles.map((r) => ({
          id: r.id,
          title: r.title,
          name: r.name,
          created_at: r.created_at,
          updated_at: r.updated_at,
          permission_count: r.permission_roles.length,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 0,
        },
      },
    };
  }

  async getRole(id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, ...this.activeRoleWhere() },
      select: {
        id: true,
        title: true,
        name: true,
        created_at: true,
        updated_at: true,
        permission_roles: {
          select: {
            permission: {
              select: {
                id: true,
                title: true,
                action: true,
                subject: true,
              },
            },
          },
        },
      },
    });

    if (!role) throw new NotFoundException('Role not found');

    return {
      success: true,
      data: {
        id: role.id,
        title: role.title,
        name: role.name,
        created_at: role.created_at,
        updated_at: role.updated_at,
        permissions: role.permission_roles.map((pr) => pr.permission),
      },
    };
  }

  async createRole(dto: CreateRoleDto) {
    if (
      RESERVED_ROLE_SLUGS.includes(
        dto.name as (typeof RESERVED_ROLE_SLUGS)[number],
      )
    ) {
      throw new BadRequestException('This role name is reserved');
    }

    const exists = await this.prisma.role.findFirst({
      where: { name: dto.name, deleted_at: null },
      select: { id: true },
    });
    if (exists) throw new BadRequestException('Role name already exists');

    const role = await this.prisma.role.create({
      data: {
        title: dto.title,
        name: dto.name,
      },
      select: { id: true, title: true, name: true, created_at: true },
    });

    return {
      success: true,
      message: 'Role created successfully',
      data: role,
    };
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findFirst({
      where: { id, ...this.activeRoleWhere() },
    });
    if (!role) throw new NotFoundException('Role not found');

    if (
      IMMUTABLE_ROLE_SLUGS.includes(
        role.name as (typeof IMMUTABLE_ROLE_SLUGS)[number],
      ) &&
      dto.name &&
      dto.name !== role.name
    ) {
      throw new BadRequestException(
        `Protected role '${role.title}' cannot be renamed`,
      );
    }

    if (dto.name) {
      if (
        RESERVED_ROLE_SLUGS.includes(
          dto.name as (typeof RESERVED_ROLE_SLUGS)[number],
        ) &&
        dto.name !== role.name
      ) {
        throw new BadRequestException('This role name is reserved');
      }
      const dup = await this.prisma.role.findFirst({
        where: {
          name: dto.name,
          id: { not: id },
          deleted_at: null,
        },
        select: { id: true },
      });
      if (dup) throw new BadRequestException('Role name already exists');
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
      },
      select: { id: true, title: true, name: true, updated_at: true },
    });

    return {
      success: true,
      message: 'Role updated',
      data: updated,
    };
  }

  async deleteRole(id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, ...this.activeRoleWhere() },
    });
    if (!role) throw new NotFoundException('Role not found');

    if (
      IMMUTABLE_ROLE_SLUGS.includes(
        role.name as (typeof IMMUTABLE_ROLE_SLUGS)[number],
      )
    ) {
      throw new BadRequestException(
        `Protected role '${role.title}' cannot be deleted`,
      );
    }

    const roleUsage = await this.prisma.roleUser.findFirst({
      where: { role_id: id },
      select: { user_id: true },
    });

    if (roleUsage) {
      throw new BadRequestException(
        'Cannot delete role that is assigned to users. Remove assignments first.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.permissionRole.deleteMany({ where: { role_id: id } }),
      this.prisma.role.update({
        where: { id },
        data: { deleted_at: new Date() },
      }),
    ]);

    return { success: true, message: 'Role deleted successfully' };
  }

  async listPermissions() {
    const permissions = await this.prisma.permission.findMany({
      where: this.activePermissionWhere(),
      orderBy: { title: 'asc' },
      select: { id: true, title: true, action: true, subject: true },
    });

    return { success: true, data: { permissions } };
  }

  async getRoleStatistics() {
    const whereRole = this.activeRoleWhere();
    const wherePerm = this.activePermissionWhere();

    const [roleCount, userCount, permissionCount] = await Promise.all([
      this.prisma.role.count({ where: whereRole }),
      this.prisma.user.count({ where: { deleted_at: null } }),
      this.prisma.permission.count({ where: wherePerm }),
    ]);

    const roleUsage = await this.prisma.role.findMany({
      where: whereRole,
      select: {
        id: true,
        title: true,
        name: true,
        _count: {
          select: {
            role_users: true,
            permission_roles: true,
          },
        },
      },
    });

    const systemRoles = [...IMMUTABLE_ROLE_SLUGS, 'admin'] as string[];
    const systemRolesData = roleUsage.filter((r) =>
      systemRoles.includes(r.name ?? ''),
    );
    const customRolesData = roleUsage.filter(
      (r) => !systemRoles.includes(r.name ?? ''),
    );

    return {
      success: true,
      data: {
        summary: {
          total_roles: roleCount,
          system_roles: systemRolesData.length,
          custom_roles: customRolesData.length,
          total_users: userCount,
          total_permissions: permissionCount,
        },
        system_roles: systemRolesData.map((role) => ({
          id: role.id,
          title: role.title,
          name: role.name,
          user_count: role._count.role_users,
          permission_count: role._count.permission_roles,
        })),
        custom_roles: customRolesData.map((role) => ({
          id: role.id,
          title: role.title,
          name: role.name,
          user_count: role._count.role_users,
          permission_count: role._count.permission_roles,
        })),
      },
    };
  }

  async setRolePermissions(id: string, dto: SetRolePermissionsDto) {
    const role = await this.prisma.role.findFirst({
      where: { id, ...this.activeRoleWhere() },
    });
    if (!role) throw new NotFoundException('Role not found');

    if (
      IMMUTABLE_ROLE_SLUGS.includes(
        role.name as (typeof IMMUTABLE_ROLE_SLUGS)[number],
      )
    ) {
      throw new BadRequestException(
        `Cannot modify permissions for protected role '${role.title}'`,
      );
    }

    const found = await this.prisma.permission.findMany({
      where: {
        id: { in: dto.permission_ids },
        ...this.activePermissionWhere(),
      },
      select: { id: true, title: true, action: true, subject: true },
    });

    if (found.length !== dto.permission_ids.length) {
      const invalidIds = dto.permission_ids.filter(
        (pid) => !found.some((p) => p.id === pid),
      );
      throw new BadRequestException(
        `Invalid permission IDs: ${invalidIds.join(', ')}`,
      );
    }

    if (role.name !== 'su_admin') {
      const systemPermissions = found.filter((p) =>
        (p.title ?? '').startsWith('system_tenant_management_'),
      );
      if (systemPermissions.length > 0) {
        throw new BadRequestException(
          'System tenant management permissions can only be assigned to Super Admin role',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.mode === SetRolePermissionsMode.replace) {
        await tx.permissionRole.deleteMany({ where: { role_id: id } });
        await tx.permissionRole.createMany({
          data: dto.permission_ids.map((pid) => ({
            role_id: id,
            permission_id: pid,
          })),
          skipDuplicates: true,
        });
      } else if (dto.mode === SetRolePermissionsMode.assign) {
        await tx.permissionRole.createMany({
          data: dto.permission_ids.map((pid) => ({
            role_id: id,
            permission_id: pid,
          })),
          skipDuplicates: true,
        });
      } else if (dto.mode === SetRolePermissionsMode.remove) {
        await tx.permissionRole.deleteMany({
          where: { role_id: id, permission_id: { in: dto.permission_ids } },
        });
      } else {
        throw new BadRequestException(
          'Invalid mode. Must be assign, replace, or remove',
        );
      }
    });

    const updated = await this.prisma.role.findFirst({
      where: { id, ...this.activeRoleWhere() },
      select: {
        id: true,
        title: true,
        name: true,
        created_at: true,
        updated_at: true,
        permission_roles: {
          select: {
            permission: {
              select: { id: true, title: true, action: true, subject: true },
            },
          },
        },
      },
    });

    const modePast: Record<SetRolePermissionsMode, string> = {
      [SetRolePermissionsMode.assign]: 'assigned',
      [SetRolePermissionsMode.replace]: 'replaced',
      [SetRolePermissionsMode.remove]: 'removed',
    };

    return {
      success: true,
      message: `Permissions ${modePast[dto.mode]} successfully`,
      data: {
        id: updated!.id,
        title: updated!.title,
        name: updated!.name,
        created_at: updated!.created_at,
        updated_at: updated!.updated_at,
        permissions: updated!.permission_roles.map((pr) => pr.permission),
      },
    };
  }
}

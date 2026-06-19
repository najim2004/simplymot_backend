import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/common/swagger/dto/api-response.dto';

/** Permission row as returned by the API (matches DB + CASL subject/action). */
export class PermissionRecordDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxx' })
  id: string;

  @ApiPropertyOptional({ example: 'user_management_read', nullable: true })
  title: string | null;

  @ApiPropertyOptional({ example: 'Read', nullable: true })
  action: string | null;

  @ApiPropertyOptional({ example: 'User', nullable: true })
  subject: string | null;
}

export class RoleListItemDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  title: string | null;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at: Date;

  @ApiProperty({
    description: 'Number of permissions linked to this role',
    example: 12,
  })
  permission_count: number;
}

export class ListRolesDataDto {
  @ApiProperty({ type: [RoleListItemDto] })
  roles: RoleListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination: PaginationMetaDto;
}

export class ListRolesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ListRolesDataDto })
  data: ListRolesDataDto;
}

export class ListPermissionsDataDto {
  @ApiProperty({ type: [PermissionRecordDto] })
  permissions: PermissionRecordDto[];
}

export class ListPermissionsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ListPermissionsDataDto })
  data: ListPermissionsDataDto;
}

export class RoleStatisticsSummaryDto {
  @ApiProperty()
  total_roles: number;

  @ApiProperty()
  system_roles: number;

  @ApiProperty()
  custom_roles: number;

  @ApiProperty()
  total_users: number;

  @ApiProperty()
  total_permissions: number;
}

export class RoleUsageRowDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  title: string | null;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiProperty()
  user_count: number;

  @ApiProperty()
  permission_count: number;
}

export class RoleStatisticsDataDto {
  @ApiProperty({ type: RoleStatisticsSummaryDto })
  summary: RoleStatisticsSummaryDto;

  @ApiProperty({ type: [RoleUsageRowDto] })
  system_roles: RoleUsageRowDto[];

  @ApiProperty({ type: [RoleUsageRowDto] })
  custom_roles: RoleUsageRowDto[];
}

export class RoleStatisticsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: RoleStatisticsDataDto })
  data: RoleStatisticsDataDto;
}

export class RoleDetailDataDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  title: string | null;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at: Date;

  @ApiProperty({ type: [PermissionRecordDto] })
  permissions: PermissionRecordDto[];
}

export class RoleDetailResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: RoleDetailDataDto })
  data: RoleDetailDataDto;
}

export class RoleMutationDataDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  title: string | null;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  created_at?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  updated_at?: Date;
}

export class CreateRoleResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Role created successfully' })
  message: string;

  @ApiProperty({ type: RoleMutationDataDto })
  data: RoleMutationDataDto;
}

export class UpdateRoleResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Role updated' })
  message: string;

  @ApiProperty({ type: RoleMutationDataDto })
  data: RoleMutationDataDto;
}

export class DeleteRoleResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Role deleted successfully' })
  message: string;
}

export class SetRolePermissionsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Permissions assigned successfully' })
  message: string;

  @ApiProperty({ type: RoleDetailDataDto })
  data: RoleDetailDataDto;
}

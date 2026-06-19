import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MessageSuccessWithNullDataDto,
  PaginationMetaDto,
} from 'src/common/swagger/dto/api-response.dto';

export class AdminUserListItemDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatar: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatar_url: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiProperty()
  kind: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  email_verified_at: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  approved_at: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty()
  status: string;
}

export class AdminUserCreatedDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiProperty()
  kind: string;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  email_verified_at: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  approved_at: Date | null;

  @ApiPropertyOptional({ nullable: true })
  billing_id: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty({ type: [Object] })
  roles: Record<string, unknown>[];
}

export class AdminUserDeletedRecordsDto {
  @ApiProperty()
  vehicles: number;

  @ApiProperty()
  services: number;

  @ApiProperty()
  subscriptions: number;
}

export class AdminUserDeletedDto {
  @ApiProperty()
  user_id: string;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiProperty()
  kind: string;

  @ApiProperty({ type: String, format: 'date-time' })
  deleted_at: Date;

  @ApiProperty({ type: AdminUserDeletedRecordsDto })
  deleted_records: AdminUserDeletedRecordsDto;

  @ApiPropertyOptional({ nullable: true })
  stripe_customer_id: string | null;
}

export class AdminBanUserDataDto {
  @ApiProperty()
  cancelled_subscriptions: number;
}

export class CreateUserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: AdminUserCreatedDto })
  data: AdminUserCreatedDto;
}

export class ListUsersResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [AdminUserListItemDto] })
  data: AdminUserListItemDto[];

  @ApiProperty({ name: 'meta_data', type: PaginationMetaDto })
  meta_data: PaginationMetaDto;
}

export class GetUserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: AdminUserListItemDto })
  data: AdminUserListItemDto;
}

export class BanUserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: AdminBanUserDataDto })
  data: AdminBanUserDataDto;
}

export class DeleteUserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: AdminUserDeletedDto })
  data: AdminUserDeletedDto;
}

export {
  MessageSuccessWithNullDataDto as ApproveUserResponseDto,
  MessageSuccessWithNullDataDto as RejectUserResponseDto,
  MessageSuccessWithNullDataDto as UnbanUserResponseDto,
  MessageSuccessWithNullDataDto as UpdateUserResponseDto,
};

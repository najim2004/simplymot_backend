import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IdOnlyDto } from 'src/common/swagger/dto/api-response.dto';

export class NotificationUserDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatar: string | null;
}

export class NotificationEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;
}

export class NotificationDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  sender_id: string | null;

  @ApiProperty()
  receiver_id: string;

  @ApiPropertyOptional({ nullable: true })
  entity_id: string | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  read_at: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ type: NotificationUserDto, nullable: true })
  sender: NotificationUserDto | null;

  @ApiProperty({ type: NotificationUserDto })
  receiver: NotificationUserDto;

  @ApiProperty({ type: NotificationEventDto })
  notification_event: NotificationEventDto;
}

export class NotificationListMetaDto {
  @ApiProperty()
  receiver_kind: string;
}

export class UnreadCountDto {
  @ApiProperty()
  unread_count: number;

  @ApiProperty()
  receiver_kind: string;
}

export class MarkedCountDto {
  @ApiProperty()
  marked_count: number;
}

export class DeletedCountDto {
  @ApiProperty()
  deleted_count: number;
}

export class ListNotificationsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [NotificationDto] })
  data: NotificationDto[];

  @ApiProperty({ name: 'meta_data', type: NotificationListMetaDto })
  meta_data: NotificationListMetaDto;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: UnreadCountDto })
  data: UnreadCountDto;
}

export class GetNotificationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: NotificationDto })
  data: NotificationDto;
}

export class MarkNotificationsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: MarkedCountDto })
  data: MarkedCountDto;
}

export class MarkOneNotificationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: NotificationDto })
  data: NotificationDto;
}

export class DeleteAllNotificationsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: DeletedCountDto })
  data: DeletedCountDto;
}

export class DeleteNotificationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: IdOnlyDto })
  data: IdOnlyDto;
}

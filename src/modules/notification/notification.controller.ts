import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  DeleteAllNotificationsResponseDto,
  DeleteNotificationResponseDto,
  GetNotificationResponseDto,
  ListNotificationsResponseDto,
  MarkNotificationsResponseDto,
  MarkOneNotificationResponseDto,
  UnreadCountResponseDto,
} from './dto/swagger/notification-api.dto';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notification')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @apiTypedDoc(
    {
      summary: 'List notifications',
      description: 'JWT. User notifications list.',
    },
    { type: ListNotificationsResponseDto },
  )
  @Get()
  findAll(@User('id') user_id: string) {
    return this.notificationService.findAll(user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Unread count',
      description: 'JWT. Returns `unread_count`.',
    },
    { type: UnreadCountResponseDto },
  )
  @Get('count')
  count(@User('id') user_id: string) {
    return this.notificationService.countUnread(user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Unread count',
      description: 'JWT. Returns `unread_count`.',
    },
    { type: UnreadCountResponseDto },
  )
  @Get('unread-count')
  unreadCount(@User('id') user_id: string) {
    return this.notificationService.countUnread(user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Get notification',
      description: 'JWT. Single notification.',
    },
    { type: GetNotificationResponseDto },
  )
  @Get(':id')
  findOne(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.findOne(id, user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Mark all as read',
      description: 'JWT. Returns `marked_count`.',
    },
    { type: MarkNotificationsResponseDto },
  )
  @Patch('read-all')
  markAllRead(@User('id') user_id: string) {
    return this.notificationService.markAll(user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Mark all as read',
      description: 'JWT. Returns `marked_count`.',
    },
    { type: MarkNotificationsResponseDto },
  )
  @Patch('all/mark')
  markAll(@User('id') user_id: string) {
    return this.notificationService.markAll(user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Mark as read',
      description: 'JWT. Mark one notification read.',
    },
    { type: MarkOneNotificationResponseDto },
  )
  @Patch(':id/read')
  markOneRead(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.markOne(id, user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Mark as read',
      description: 'JWT. Mark one notification read.',
    },
    { type: MarkOneNotificationResponseDto },
  )
  @Patch(':id/mark')
  markOne(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.markOne(id, user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Delete all notifications',
      description: 'JWT. Returns `deleted_count`.',
    },
    { type: DeleteAllNotificationsResponseDto },
  )
  @Delete('all')
  removeAll(@User('id') user_id: string) {
    return this.notificationService.removeAll(user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Delete notification',
      description: 'JWT. Delete one notification.',
    },
    { type: DeleteNotificationResponseDto },
  )
  @Delete(':id')
  remove(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.remove(id, user_id);
  }
}

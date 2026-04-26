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
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notification')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiSuccessResponse({
    summary: 'List my notifications',
    message: 'Notifications fetched successfully',
    data: [],
    metaData: { receiver_kind: 'USER' },
    includeAuthErrors: true,
  })
  @Get()
  findAll(@User('id') user_id: string) {
    return this.notificationService.findAll(user_id);
  }

  @ApiSuccessResponse({
    summary: 'Get unread notification count',
    message: 'Unread notification count fetched successfully',
    data: { unread_count: 3, receiver_kind: 'USER' },
    includeAuthErrors: true,
  })
  @Get('count')
  count(@User('id') user_id: string) {
    return this.notificationService.countUnread(user_id);
  }

  @ApiSuccessResponse({
    summary: 'Get unread notification count',
    message: 'Unread notification count fetched successfully',
    data: { unread_count: 3, receiver_kind: 'USER' },
    includeAuthErrors: true,
  })
  @Get('unread-count')
  unreadCount(@User('id') user_id: string) {
    return this.notificationService.countUnread(user_id);
  }

  @ApiSuccessResponse({
    summary: 'Get notification details',
    message: 'Notification fetched successfully',
    data: { id: 'notification_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':id')
  findOne(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.findOne(id, user_id);
  }

  @ApiSuccessResponse({
    summary: 'Mark all notifications as read',
    message: 'All notifications marked successfully',
    data: { marked_count: 3 },
    includeAuthErrors: true,
  })
  @Patch('read-all')
  markAllRead(@User('id') user_id: string) {
    return this.notificationService.markAll(user_id);
  }

  @ApiSuccessResponse({
    summary: 'Mark all notifications as read',
    message: 'All notifications marked successfully',
    data: { marked_count: 3 },
    includeAuthErrors: true,
  })
  @Patch('all/mark')
  markAll(@User('id') user_id: string) {
    return this.notificationService.markAll(user_id);
  }

  @ApiSuccessResponse({
    summary: 'Mark notification as read',
    message: 'Notification marked successfully',
    data: { id: 'notification_id', status: 'READ' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Patch(':id/read')
  markOneRead(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.markOne(id, user_id);
  }

  @ApiSuccessResponse({
    summary: 'Mark notification as read',
    message: 'Notification marked successfully',
    data: { id: 'notification_id', status: 'READ' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Patch(':id/mark')
  markOne(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.markOne(id, user_id);
  }

  @ApiSuccessResponse({
    summary: 'Delete all notifications',
    message: 'All notifications deleted successfully',
    data: { deleted_count: 3 },
    includeAuthErrors: true,
  })
  @Delete('all')
  removeAll(@User('id') user_id: string) {
    return this.notificationService.removeAll(user_id);
  }

  @ApiSuccessResponse({
    summary: 'Delete notification',
    message: 'Notification deleted successfully',
    data: { id: 'notification_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Delete(':id')
  remove(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.remove(id, user_id);
  }
}

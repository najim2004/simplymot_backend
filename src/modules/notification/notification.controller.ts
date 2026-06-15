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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

const NOTIFICATION_ITEM = {
  id: 'clnotif001',
  sender_id: null,
  receiver_id: 'cluser001',
  entity_id: 'clbooking001',
  status: 'UNREAD',
  read_at: null,
  created_at: '2026-06-14T10:00:00.000Z',
  type: 'BOOKING_CONFIRMED',
  title: 'Booking confirmed',
  description: 'Your MOT booking is confirmed for 20 Jun 2026',
  sender: null,
  receiver: {
    id: 'cluser001',
    name: 'John Driver',
    email: 'john@example.com',
    avatar: null,
  },
  notification_event: {
    id: 'clevent001',
    type: 'BOOKING_CONFIRMED',
    title: 'Booking confirmed',
    description: 'Booking confirmed notification',
  },
};

const UNREAD_COUNT = { unread_count: 3, receiver_kind: 'DRIVER' };
const MARKED_COUNT = { marked_count: 3 };
const DELETED_COUNT = { deleted_count: 5 };

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notification')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({
    summary: 'List notifications',
    description: 'JWT. User notifications list.',
  })
  @ApiSuccessResponse({
    message: 'Notifications fetched successfully',
    data: [NOTIFICATION_ITEM],
    metaData: { receiver_kind: 'DRIVER' },
  })
  @Get()
  findAll(@User('id') user_id: string) {
    return this.notificationService.findAll(user_id);
  }

  @ApiOperation({
    summary: 'Unread count',
    description: 'JWT. Returns `unread_count`.',
  })
  @ApiSuccessResponse({
    message: 'Unread notification count fetched successfully',
    data: UNREAD_COUNT,
  })
  @Get('count')
  count(@User('id') user_id: string) {
    return this.notificationService.countUnread(user_id);
  }

  @ApiOperation({
    summary: 'Unread count',
    description: 'JWT. Returns `unread_count`.',
  })
  @ApiSuccessResponse({
    message: 'Unread notification count fetched successfully',
    data: UNREAD_COUNT,
  })
  @Get('unread-count')
  unreadCount(@User('id') user_id: string) {
    return this.notificationService.countUnread(user_id);
  }

  @ApiOperation({
    summary: 'Get notification',
    description: 'JWT. Single notification.',
  })
  @ApiSuccessResponse({
    message: 'Notification fetched successfully',
    data: NOTIFICATION_ITEM,
  })
  @Get(':id')
  findOne(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.findOne(id, user_id);
  }

  @ApiOperation({
    summary: 'Mark all as read',
    description: 'JWT. Returns `marked_count`.',
  })
  @ApiSuccessResponse({
    message: 'All notifications marked successfully',
    data: MARKED_COUNT,
  })
  @Patch('read-all')
  markAllRead(@User('id') user_id: string) {
    return this.notificationService.markAll(user_id);
  }

  @ApiOperation({
    summary: 'Mark all as read',
    description: 'JWT. Returns `marked_count`.',
  })
  @ApiSuccessResponse({
    message: 'All notifications marked successfully',
    data: MARKED_COUNT,
  })
  @Patch('all/mark')
  markAll(@User('id') user_id: string) {
    return this.notificationService.markAll(user_id);
  }

  @ApiOperation({
    summary: 'Mark as read',
    description: 'JWT. Mark one notification read.',
  })
  @ApiSuccessResponse({
    message: 'Notification marked successfully',
    data: { ...NOTIFICATION_ITEM, status: 'READ' },
  })
  @Patch(':id/read')
  markOneRead(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.markOne(id, user_id);
  }

  @ApiOperation({
    summary: 'Mark as read',
    description: 'JWT. Mark one notification read.',
  })
  @ApiSuccessResponse({
    message: 'Notification marked successfully',
    data: { ...NOTIFICATION_ITEM, status: 'READ' },
  })
  @Patch(':id/mark')
  markOne(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.markOne(id, user_id);
  }

  @ApiOperation({
    summary: 'Delete all notifications',
    description: 'JWT. Returns `deleted_count`.',
  })
  @ApiSuccessResponse({
    message: 'All notifications deleted successfully',
    data: DELETED_COUNT,
  })
  @Delete('all')
  removeAll(@User('id') user_id: string) {
    return this.notificationService.removeAll(user_id);
  }

  @ApiOperation({
    summary: 'Delete notification',
    description: 'JWT. Delete one notification.',
  })
  @ApiSuccessResponse({
    message: 'Notification deleted successfully',
    data: { id: 'clnotif001' },
  })
  @Delete(':id')
  remove(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.remove(id, user_id);
  }
}

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

@Controller('notification')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(@User('id') user_id: string) {
    return this.notificationService.findAll(user_id);
  }

  @Get('count')
  count(@User('id') user_id: string) {
    return this.notificationService.countUnread(user_id);
  }

  @Get('unread-count')
  unreadCount(@User('id') user_id: string) {
    return this.notificationService.countUnread(user_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.findOne(id, user_id);
  }

  @Patch('read-all')
  markAllRead(@User('id') user_id: string) {
    return this.notificationService.markAll(user_id);
  }

  @Patch('all/mark')
  markAll(@User('id') user_id: string) {
    return this.notificationService.markAll(user_id);
  }

  @Patch(':id/read')
  markOneRead(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.markOne(id, user_id);
  }

  @Patch(':id/mark')
  markOne(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.markOne(id, user_id);
  }

  @Delete('all')
  removeAll(@User('id') user_id: string) {
    return this.notificationService.removeAll(user_id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.remove(id, user_id);
  }
}

import { Controller, Get, Param, Patch } from '@nestjs/common';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(@User('id') user_id: string) {
    return this.notificationService.findAll(user_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.findOne(id, user_id);
  }

  @Patch('all/mark')
  markAll(@User('id') user_id: string) {
    return this.notificationService.markAll(user_id);
  }

  @Patch(':id/mark')
  markOne(@Param('id') id: string, @User('id') user_id: string) {
    return this.notificationService.markOne(id, user_id);
  }
}

import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiBearerAuth()
@ApiTags('Notification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Get all notifications' })
  @Get()
  findAll(@Req() req: Request) {
    return this.notificationService.findAll(req.user.id);
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Patch('all/mark')
  markAll(@Req() req: Request) {
    return this.notificationService.markAll(req.user.id);
  }

  @ApiOperation({ summary: 'Mark notification as read' })
  @Patch(':id/mark')
  markOne(@Req() req: Request, @Param('id') id: string) {
    return this.notificationService.markOne(id, req.user.id);
  }

  @ApiOperation({ summary: 'Delete notification' })
  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.notificationService.remove(id, req.user.id);
  }

  @ApiOperation({ summary: 'Delete all notifications' })
  @Delete()
  removeAll(@Req() req: Request) {
    return this.notificationService.removeAll(req.user.id);
  }
}

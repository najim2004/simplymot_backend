import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { NotificationGateway } from 'src/common/gateway/notification.gateway';
import { Prisma } from 'prisma/generated/client';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const notification =
      await this.notificationRepository.createNotification(createNotificationDto);
    const formattedNotification = this.formatNotification(notification);

    await this.notificationGateway.publishNotification(formattedNotification);

    return ResponseHelper.success({
      message: 'Notification created successfully',
      data: formattedNotification,
    });
  }

  async findAll(user_id?: string) {
    const notifications = await this.prisma.notification.findMany({
      where: user_id ? this.userNotificationWhere(user_id) : {},
      select: {
        id: true,
        sender_id: true,
        receiver_id: true,
        entity_id: true,
        status: true,
        read_at: true,
        created_at: true,
        notification_event: {
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return ResponseHelper.success({
      message: 'Notifications fetched successfully',
      data: notifications.map((notification) =>
        this.formatNotification(notification),
      ),
    });
  }

  async findOne(id: string | number, user_id?: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: String(id),
        ...(user_id ? this.userNotificationWhere(user_id) : {}),
      },
      select: {
        id: true,
        sender_id: true,
        receiver_id: true,
        entity_id: true,
        status: true,
        read_at: true,
        created_at: true,
        notification_event: {
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
          },
        },
      },
    });

    return ResponseHelper.success({
      message: 'Notification fetched successfully',
      data: notification ? this.formatNotification(notification) : null,
    });
  }

  async markOne(id: string, user_id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        ...this.userNotificationWhere(user_id),
      },
      select: { id: true },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    const markedNotification = await this.prisma.notification.update({
      where: { id },
      data: {
        status: 'READ',
        read_at: new Date(),
      },
      select: this.notificationSelect(),
    });

    return ResponseHelper.success({
      message: 'Notification marked successfully',
      data: this.formatNotification(markedNotification),
    });
  }

  async markAll(user_id: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        ...this.userNotificationWhere(user_id),
        read_at: null,
      },
      data: {
        status: 'READ',
        read_at: new Date(),
      },
    });

    return ResponseHelper.success({
      message: 'All notifications marked successfully',
      data: { marked_count: result.count },
    });
  }

  private userNotificationWhere(user_id: string): Prisma.NotificationWhereInput {
    return {
      deleted_at: null,
      OR: [{ receiver_id: user_id }, { receiver_id: null }],
    };
  }

  private notificationSelect() {
    return {
      id: true,
      sender_id: true,
      receiver_id: true,
      entity_id: true,
      status: true,
      read_at: true,
      created_at: true,
      notification_event: {
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
        },
      },
    } as const;
  }

  private formatNotification(notification: any) {
    const event = notification.notification_event;

    return {
      ...notification,
      type: event?.type ?? null,
      title: event?.title ?? 'Notification',
      description: event?.description ?? null,
      notification_event: event
        ? {
            ...event,
            type: event.type ?? null,
            title: event.title ?? 'Notification',
            description: event.description ?? null,
          }
        : null,
    };
  }
}

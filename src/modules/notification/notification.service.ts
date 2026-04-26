import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { NotificationGateway } from 'src/common/gateway/notification.gateway';
import { Prisma } from 'prisma/generated/client';
import { UserKind } from 'prisma/generated/enums';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const notification = await this.notificationRepository.createNotification(
      createNotificationDto,
    );
    const formattedNotification = this.formatNotification(notification);

    await this.notificationGateway.publishNotification(formattedNotification);

    return ResponseHelper.success({
      message: 'Notification created successfully',
      data: formattedNotification,
    });
  }

  async findAll(user_id?: string) {
    const scope = await this.resolveNotificationScope(user_id);
    const notifications = await this.prisma.notification.findMany({
      where: this.notificationWhere(scope.user_id),
      select: this.notificationSelect(),
      orderBy: { created_at: 'desc' },
    });

    this.attachAvatarUrls(notifications);

    return ResponseHelper.success({
      message: 'Notifications fetched successfully',
      meta_data: {
        receiver_kind: scope.kind,
      },
      data: notifications.map((notification) =>
        this.formatNotification(notification),
      ),
    });
  }

  async findOne(id: string | number, user_id?: string) {
    const scope = await this.resolveNotificationScope(user_id);
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: String(id),
        ...this.notificationWhere(scope.user_id),
      },
      select: this.notificationSelect(),
    });

    if (notification) this.attachAvatarUrls([notification]);

    return ResponseHelper.success({
      message: 'Notification fetched successfully',
      meta_data: {
        receiver_kind: scope.kind,
      },
      data: notification ? this.formatNotification(notification) : null,
    });
  }

  async countUnread(user_id: string) {
    const scope = await this.resolveNotificationScope(user_id);
    const total = await this.prisma.notification.count({
      where: {
        ...this.notificationWhere(scope.user_id),
        read_at: null,
      },
    });

    return ResponseHelper.success({
      message: 'Unread notification count fetched successfully',
      data: {
        unread_count: total,
        receiver_kind: scope.kind,
      },
    });
  }

  async markOne(id: string, user_id: string) {
    const scope = await this.resolveNotificationScope(user_id);
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        ...this.notificationWhere(scope.user_id),
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

    this.attachAvatarUrls([markedNotification]);

    return ResponseHelper.success({
      message: 'Notification marked successfully',
      data: this.formatNotification(markedNotification),
    });
  }

  async markAll(user_id: string) {
    const scope = await this.resolveNotificationScope(user_id);
    const result = await this.prisma.notification.updateMany({
      where: {
        ...this.notificationWhere(scope.user_id),
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

  async remove(id: string, user_id: string) {
    const scope = await this.resolveNotificationScope(user_id);
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        ...this.notificationWhere(scope.user_id),
      },
      select: { id: true },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    await this.prisma.notification.delete({
      where: { id },
    });

    return ResponseHelper.success({
      message: 'Notification deleted successfully',
      data: { id },
    });
  }

  async removeAll(user_id: string) {
    const scope = await this.resolveNotificationScope(user_id);
    const result = await this.prisma.notification.deleteMany({
      where: this.notificationWhere(scope.user_id),
    });

    return ResponseHelper.success({
      message: 'All notifications deleted successfully',
      data: { deleted_count: result.count },
    });
  }

  private notificationWhere(user_id?: string): Prisma.NotificationWhereInput {
    return {
      deleted_at: null,
      ...(user_id
        ? { OR: [{ receiver_id: user_id }, { receiver_id: null }] }
        : {}),
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
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
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

  private async resolveNotificationScope(user_id?: string) {
    if (!user_id) {
      return {
        user_id: undefined,
        kind: UserKind.USER,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, kind: true },
    });

    return {
      user_id,
      kind: user?.kind ?? UserKind.USER,
    };
  }

  private attachAvatarUrls(notifications: any[]) {
    for (const notification of notifications) {
      if (notification.sender?.avatar) {
        notification.sender.avatar_url = SojebStorage.url(
          appConfig().storageUrl.avatar + notification.sender.avatar,
        );
      }

      if (notification.receiver?.avatar) {
        notification.receiver.avatar_url = SojebStorage.url(
          appConfig().storageUrl.avatar + notification.receiver.avatar,
        );
      }
    }
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

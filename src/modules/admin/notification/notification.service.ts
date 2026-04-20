import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { Role } from '../../../common/guard/role/role.enum';
import { Prisma } from 'prisma/generated/client';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private userRepository: UserRepository,
  ) {}

  async findAll(user_id: string) {
    const where_condition: Prisma.NotificationWhereInput = {};
    const userDetails = await this.userRepository.getUserDetails(user_id);

    if (userDetails.kind === Role.ADMIN) {
      where_condition['OR'] = [
        { receiver_id: { equals: user_id } },
        { receiver_id: { equals: null } },
      ];
    }

    const notifications = await this.prisma.notification.findMany({
      where: {
        ...where_condition,
      },
      select: {
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
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    this.attachAvatarUrls(notifications);

    return {
      success: true,
      data: notifications.map((notification) =>
        this.formatNotification(notification),
      ),
    };
  }

  async remove(id: string, user_id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        ...this.userNotificationWhere(user_id),
      },
      select: { id: true },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    await this.prisma.notification.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }

  async removeAll(user_id: string) {
    const notifications = await this.prisma.notification.findMany({
      where: this.userNotificationWhere(user_id),
      select: { id: true },
    });

    if (!notifications.length) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.deleteMany({
      where: this.userNotificationWhere(user_id),
    });

    return {
      success: true,
      message: 'All notifications deleted successfully',
    };
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

    this.attachAvatarUrls([markedNotification]);

    return {
      success: true,
      message: 'Notification marked successfully',
      data: this.formatNotification(markedNotification),
    };
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

    return {
      success: true,
      message: 'All notifications marked successfully',
      data: { marked_count: result.count },
    };
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

  private userNotificationWhere(user_id: string): Prisma.NotificationWhereInput {
    return {
      deleted_at: null,
      OR: [{ receiver_id: user_id }, { receiver_id: null }],
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
}

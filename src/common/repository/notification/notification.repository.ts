import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}
  /**
   * Create a notification
   * @param sender_id - The ID of the user who fired the event
   * @param receiver_id - The ID of the user to notify
   * @param title - The title of the notification
   * @param description - The description of the notification
   * @param type - The type of the notification
   * @param entity_id - The ID of the entity related to the notification
   * @returns The created notification
   */
  async createNotification({
    sender_id,
    receiver_id,
    title,
    description,
    text,
    type,
    entity_id,
  }: {
    sender_id?: string;
    receiver_id?: string;
    title?: string;
    description?: string;
    text?: string;
    type?: string;
    entity_id?: string;
  }) {
    const eventDescription = description ?? text;

    const notificationEvent = await this.prisma.notificationEvent.create({
      data: {
        type,
        title: title ?? eventDescription ?? 'Notification',
        description: eventDescription ?? null,
      },
    });

    const notificationData = {};
    if (sender_id) {
      notificationData['sender_id'] = sender_id;
    }
    if (receiver_id) {
      notificationData['receiver_id'] = receiver_id;
    }
    if (entity_id) {
      notificationData['entity_id'] = entity_id;
    }

    const notification = await this.prisma.notification.create({
      data: {
        notification_event_id: notificationEvent.id,
        ...notificationData,
      },
      include: {
        notification_event: {
          select: {
            type: true,
            title: true,
            description: true,
          },
        },
      },
    });

    return notification;
  }
}

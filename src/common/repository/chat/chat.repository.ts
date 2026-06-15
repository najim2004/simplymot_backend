import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateMessageStatus(_message_id: string, _status: string) {
    return;
  }

  async updateUserStatus(user_id: string, _status: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: user_id },
    });

    if (!user) {
      return;
    }

    return user;
  }
}

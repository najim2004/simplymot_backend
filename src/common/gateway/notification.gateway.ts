import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';

type NotificationJwtPayload = {
  sub?: string;
  id?: string;
  userId?: string;
  user_id?: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private redisPubClient: Redis;
  private redisSubClient: Redis;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.redisPubClient = new Redis({
      host: appConfig().redis.host,
      port: Number(appConfig().redis.port),
      password: appConfig().redis.password,
    });

    this.redisSubClient = new Redis({
      host: appConfig().redis.host,
      port: Number(appConfig().redis.port),
      password: appConfig().redis.password,
    });

    this.redisSubClient.subscribe('notification', (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to notification channel', err);
      }
    });

    this.redisSubClient.on('message', (_channel, message: string) => {
      try {
        this.emitNotification(JSON.parse(message));
      } catch (error) {
        this.logger.warn(`Invalid notification payload: ${error.message}`);
      }
    });
  }

  afterInit(_server: Server) {
    this.logger.log('Notification websocket started');
  }

  async handleConnection(client: Socket) {
    const userId = await this.authorizeSocket(client);

    if (!userId) return this.disconnectUnauthorized(client);

    client.data.userId = userId;
    await client.join(this.userRoom(userId));
    client.emit('notification:connected', { user_id: userId });
    this.logger.log(`User ${userId} connected with socket ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    this.logger.log(
      userId
        ? `User ${userId} disconnected from socket ${client.id}`
        : `Socket disconnected: ${client.id}`,
    );
  }

  async publishNotification(data: any) {
    if (!this.redisPubClient) return this.emitNotification(data);

    await this.redisPubClient.publish('notification', JSON.stringify(data));
  }

  private emitNotification(data: any) {
    const receiverId = data?.receiver_id ?? data?.receiverId ?? data?.userId;

    if (receiverId) {
      this.server
        .to(this.userRoom(String(receiverId)))
        .emit('notification', data);
      return;
    }

    this.server.emit('notification', data);
  }

  private async authorizeSocket(client: Socket): Promise<string | null> {
    const token = this.getSocketToken(client);
    if (!token) return null;

    try {
      const payload = await this.jwtService.verifyAsync<NotificationJwtPayload>(
        token,
        { secret: appConfig().jwt.secret },
      );
      const userId = this.getPayloadUserId(payload);
      if (!userId) return null;

      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          deleted_at: null,
        },
        select: { id: true, status: true },
      });

      if (!user || user.status !== 'ACTIVE') return null;

      return user.id;
    } catch (error) {
      this.logger.warn(`Unauthorized notification socket: ${error.message}`);
      return null;
    }
  }

  private getSocketToken(client: Socket): string | null {
    const auth = client.handshake.auth || {};
    const token =
      auth.token ??
      auth.accessToken ??
      auth.access_token ??
      this.getBearerToken(auth.authorization) ??
      this.getBearerToken(client.handshake.headers.authorization);

    return token ? String(token) : null;
  }

  private getBearerToken(authorization?: string | string[]): string | null {
    const value = Array.isArray(authorization)
      ? authorization[0]
      : authorization;
    if (!value) return null;

    const [type, token] = value.split(' ');
    return type?.toLowerCase() === 'bearer' && token ? token : null;
  }

  private getPayloadUserId(payload: NotificationJwtPayload): string | null {
    const userId = payload.sub ?? payload.id ?? payload.userId ?? payload.user_id;

    return userId ? String(userId) : null;
  }

  private disconnectUnauthorized(client: Socket) {
    client.emit('notification:error', { message: 'Unauthorized' });
    client.disconnect(true);
  }

  private userRoom(userId: string) {
    return `notification:user:${userId}`;
  }
}

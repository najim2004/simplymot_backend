import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationService } from './notification.service';
import { NotificationGateway } from 'src/common/gateway/notification.gateway';
import { NotificationController } from './notification.controller';
import appConfig from 'src/config/app.config';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async () => ({
        secret: appConfig().jwt.secret,
      }),
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationGateway, NotificationService],
  exports: [NotificationGateway, NotificationService],
})
export class NotificationModule {}

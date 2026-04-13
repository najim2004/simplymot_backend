// external imports
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from '@nestjs-modules/ioredis';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

// internal imports
import appConfig from './config/app.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ThrottlerBehindProxyGuard } from './common/guard/throttler-behind-proxy.guard';
import { AbilityModule } from './ability/ability.module';
import { MailModule } from './mail/mail.module';
import { ApplicationModule } from './modules/application/application.module';
import { AdminModule } from './modules/admin/admin.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PrometheusModule } from './prometheus/prometheus.module';
import { RepositoryModule } from './common/repository/repository.module';
import { ProfileModule } from './modules/profile/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    BullModule.forRoot({
      connection: {
        host: appConfig().redis.host,
        password: appConfig().redis.password,
        port: +appConfig().redis.port,
      },
      // redis: {
      //   host: appConfig().redis.host,
      //   password: appConfig().redis.password,
      //   port: +appConfig().redis.port,
      // },
    }),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: appConfig().redis.host,
        password: appConfig().redis.password,
        port: +appConfig().redis.port,
      },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          host: appConfig().redis.host,
          port: +appConfig().redis.port,
          password: appConfig().redis.password || undefined,
          ttl: 60 * 5,
        }),
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: appConfig().rateLimit.shortTtl * 1000,
          limit: appConfig().rateLimit.shortLimit,
        },
        {
          name: 'medium',
          ttl: appConfig().rateLimit.mediumTtl * 1000,
          limit: appConfig().rateLimit.mediumLimit,
        },
      ],
      storage: new ThrottlerStorageRedisService({
        host: appConfig().redis.host,
        port: +appConfig().redis.port,
        password: appConfig().redis.password || undefined,
      }),
    }),
    // General modules
    PrismaModule,
    RepositoryModule,
    AuthModule,
    AbilityModule,
    MailModule,
    ApplicationModule,
    AdminModule,
    PaymentModule,
    PrometheusModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    AppService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

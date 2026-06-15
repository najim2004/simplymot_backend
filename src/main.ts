// external imports
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
// import express from 'express';
// internal imports
import { AppModule } from './app.module';
import appConfig from './config/app.config';
import { CustomExceptionFilter } from './common/exception/custom-exception.filter';
import { SojebStorage } from './common/lib/Disk/SojebStorage';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Handle raw body for webhooks
  // app.use('/payment/stripe/webhook', express.raw({ type: 'application/json' }));

  app.setGlobalPrefix('api');
  app.enableCors();
  app.use(helmet());
  // Enable it, if special charactrers not encoding perfectly
  // app.use((req, res, next) => {
  //   // Only force content-type for specific API routes, not Swagger or assets
  //   if (req.path.startsWith('/api') && !req.path.startsWith('/api/docs')) {
  //     res.setHeader('Content-Type', 'application/json; charset=utf-8');
  //   }
  //   next();
  // });
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    index: false,
    prefix: '/public',
  });
  app.useStaticAssets(join(__dirname, '..', 'public/storage'), {
    index: false,
    prefix: '/storage',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  app.useGlobalFilters(new CustomExceptionFilter());

  // storage setup
  SojebStorage.config({
    driver: 'local',
    connection: {
      rootUrl: appConfig().storageUrl.rootUrl,
      publicUrl: appConfig().storageUrl.rootUrlPublic,
      // aws s3
      awsBucket: appConfig().fileSystems.s3.bucket,
      awsAccessKeyId: appConfig().fileSystems.s3.key,
      awsSecretAccessKey: appConfig().fileSystems.s3.secret,
      awsDefaultRegion: appConfig().fileSystems.s3.region,
      awsEndpoint: appConfig().fileSystems.s3.endpoint,
      minio: true,
      // google cloud storage
      gcpProjectId: appConfig().fileSystems.gcs.projectId,
      gcpKeyFile: appConfig().fileSystems.gcs.keyFile,
      gcpApiEndpoint: appConfig().fileSystems.gcs.apiEndpoint,
      gcpBucket: appConfig().fileSystems.gcs.bucket,
    },
  });

  // swagger
  const options = new DocumentBuilder()
    .setTitle(`${process.env.APP_NAME || 'MOT'} API`)
    .setDescription(
      [
        'REST API for garage booking, subscriptions, vehicles and admin management.',
        '',
        '**Auth:** Most endpoints require `Authorization: Bearer <token>`.',
        '**Response envelope:** `{ success, message, data, meta_data? }`',
        '',
        'Public endpoints: `POST /auth/register`, `POST /auth/login`, `GET /garages/discover`, `GET /garages/:id/slots`, `POST /contact`, `GET /subscription/success`.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT from POST /auth/login',
    })
    .addTag('Auth', 'Registration, login, profile and password flows')
    .addTag('Garage', 'Garage owner operations and public garage discovery')
    .addTag('Booking', 'Driver and garage booking management')
    .addTag('Vehicle', 'Driver vehicle fleet and MOT history')
    .addTag('Subscription', 'Garage subscription plans and Stripe checkout')
    .addTag('Invoice', 'User invoices')
    .addTag('Notification', 'In-app notifications')
    .addTag('Contact', 'Public contact form')
    .addTag('Admin Users', 'Admin user management')
    .addTag('Admin Garages', 'Admin garage management')
    .addTag('Admin Bookings', 'Admin booking oversight')
    .addTag('Admin Subscriptions', 'Subscription plan management')
    .addTag('Admin Transactions', 'Payment transaction management')
    .addTag('Admin Promo Codes', 'Promo code management')
    .addTag('Admin Vehicles', 'Vehicle administration')
    .addTag('Admin Contacts', 'Contact form submissions')
    .addTag('Admin Roles', 'Role and permission management')
    .addTag('Stripe', 'Stripe webhooks')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
  // end swagger

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();

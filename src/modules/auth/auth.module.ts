import { Logger, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { AuthController } from './auth.controller';
import appConfig from '../../config/app.config';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../../mail/mail.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { SubscriptionModule } from '../application/subscription/subscription.module';

const googleOAuthEnabled =
  Boolean(process.env.GOOGLE_APP_ID?.trim()) &&
  Boolean(process.env.GOOGLE_APP_SECRET?.trim());

if (!googleOAuthEnabled) {
  new Logger('AuthModule').log(
    'Google OAuth disabled — set GOOGLE_APP_ID and GOOGLE_APP_SECRET to enable',
  );
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // JwtModule.register({
    //   secret: appConfig().jwt.secret,
    //   signOptions: { expiresIn: appConfig().jwt.expiry },
    // }),
    JwtModule.registerAsync({
      useFactory: async () => ({
        secret: appConfig().jwt.secret,
        signOptions: { expiresIn: +appConfig().jwt.expiry },
      }),
    }),
    PrismaModule,
    MailModule,
    SubscriptionModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    ...(googleOAuthEnabled ? [GoogleStrategy] : []),
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [
    AuthService,
    PassportModule,
    JwtModule,
    JwtStrategy,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
})
export class AuthModule {}

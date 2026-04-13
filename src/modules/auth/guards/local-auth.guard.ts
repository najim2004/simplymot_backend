import {
  BadRequestException,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserAccountStatus } from 'prisma/generated/enums';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  canActivate(context: ExecutionContext) {
    // Add your custom authentication logic here
    // for example, call super.logIn(request) to establish a session.
    return super.canActivate(context);
  }

  handleRequest(err, user, info, context: ExecutionContext, status) {
    // You can throw an exception based on either "info" or "err" arguments
    const request = context.switchToHttp().getRequest();
    const { email, password } = request.body;

    if (err || !user) {
      if (!email) {
        throw new HttpException(
          { message: 'email not provided' },
          HttpStatus.OK,
        );
      } else if (!password) {
        throw new HttpException(
          { message: 'password not provided' },
          HttpStatus.OK,
        );
      } else {
        throw err || new UnauthorizedException();
      }
    }

    if (!user.email_verified_at) {
      throw new BadRequestException(
        'Please verify your email before logging in',
      );
    }

    if (user.status !== UserAccountStatus.ACTIVE) {
      if (user.status === UserAccountStatus.BANNED) {
        throw new BadRequestException('Your account has been banned');
      } else if (user.status === UserAccountStatus.SUSPENDED) {
        throw new BadRequestException('Your account has been suspended');
      } else {
        throw new BadRequestException('Your account is not activated');
      }
    }
    return user;
  }
}

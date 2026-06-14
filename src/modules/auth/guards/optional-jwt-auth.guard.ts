import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Public routes that still want `req.user` when a valid Bearer token is sent.
 * No / invalid Bearer → skip auth and continue (no `req.user`).
 * Valid Bearer → same behavior as JwtAuthGuard (user attached).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  private hasBearerToken(authHeader: unknown): boolean {
    if (typeof authHeader !== 'string') return false;
    return /^Bearer\s+\S+/i.test(authHeader.trim());
  }

  canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{ headers?: { authorization?: string } }>();
    if (!this.hasBearerToken(request.headers?.authorization)) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: Error,
    user: TUser,
    info: unknown,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}

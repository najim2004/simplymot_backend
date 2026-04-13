import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './role.enum';
import { UserRepository } from '../../../common/repository/user/user.repository';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const userId = user?.id ?? user?.userId;

    if (!userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const userDetails = await this.userRepository.getUserDetails(userId);

    if (!userDetails) {
      return false;
    }

    if (requiredRoles.some((role) => userDetails.kind === role)) {
      return true;
    } else {
      throw new HttpException(
        'You do not have permission to access this resource',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Role, type User } from '@prisma/client';
import { apiError } from './http';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(error: unknown, user: T): T {
    if (error || !user) {
      throw new UnauthorizedException(apiError('AUTH', 'Log in to continue.'));
    }
    return user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest<{ user?: User }>().user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException(apiError('FORBIDDEN', 'This account cannot open that page.'));
    }
    return true;
  }
}

import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) { super(); }
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    return super.canActivate(context) as boolean | Promise<boolean>;
  }
  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) throw new UnauthorizedException('Credenciales inválidas o sesión expirada');
    return user;
  }
}

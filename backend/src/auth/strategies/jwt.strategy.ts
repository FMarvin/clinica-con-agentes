import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly usersService: UsersService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: config.getOrThrow<string>('JWT_SECRET') });
  }
  async validate(payload: { sub: number }): Promise<ReturnType<UsersService['toPublic']>> {
    const user = await this.usersService.findActiveById(payload.sub);
    if (!user) throw new Error('Usuario no disponible');
    return this.usersService.toPublic(user);
  }
}

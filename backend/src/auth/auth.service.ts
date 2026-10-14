import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService, private readonly audit: AuditService) {}
  async login(dto: LoginDto): Promise<{ access_token: string; expires_in: number; user: ReturnType<UsersService['toPublic']> }> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.isActive || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Correo o contraseña incorrectos');
    user.lastLoginAt = new Date();
    await this.users.save(user);
    await this.audit.record('login', 'users', user.id, user.id);
    return { access_token: await this.jwt.signAsync({ sub: user.id, role: user.role.code }), expires_in: 1800, user: this.users.toPublic(user) };
  }
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.users.findActiveByIdWithPassword(userId);
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    user.passwordChangedAt = new Date();
    user.updatedBy = userId;
    await this.users.save(user);
    await this.audit.record('update', 'users', userId, userId, { passwordChanged: true });
    return { message: 'La contraseña se actualizó correctamente' };
  }
}

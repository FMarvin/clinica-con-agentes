import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

type AuthRequest = Request & { user: { id: number } };
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) { return this.service.login(dto); }

  @Post('change-password')
  changePassword(@Body() dto: ChangePasswordDto, @Req() request: AuthRequest) {
    return this.service.changePassword(request.user.id, dto);
  }
}

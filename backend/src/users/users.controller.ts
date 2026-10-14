import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';

type AuthRequest = Request & { user: { id: number } };
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get() list() { return this.service.list(); }
  @Get('roles') roles() { return this.service.listRoles(); }
  @Get('me') me(@Req() request: AuthRequest) { return this.service.getPublic(request.user.id); }
}

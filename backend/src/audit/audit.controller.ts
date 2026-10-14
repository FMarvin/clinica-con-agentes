import { Controller, DefaultValuePipe, ForbiddenException, Get, ParseIntPipe, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from './audit.service';

type AuthRequest = Request & { user: { role: { code: string } } };

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  list(
    @Req() request: AuthRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query('entity') entity?: string,
  ) {
    if (request.user.role.code !== 'admin') throw new ForbiddenException('Solo administración puede consultar la auditoría.');
    return this.service.list(page, limit, entity);
  }
}

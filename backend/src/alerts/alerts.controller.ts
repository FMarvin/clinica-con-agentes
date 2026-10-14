import { BadRequestException, Controller, Get, Param, ParseIntPipe, Patch, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AlertsService } from './alerts.service';

type AuthRequest = Request & { user: { id: number } };
@Controller('alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}
  @Get() list(@Query('unread') unread?: string, @Query('patientId') patientId?: string) {
    if (unread !== undefined && unread !== 'true' && unread !== 'false') {
      throw new BadRequestException('unread debe ser true o false');
    }
    if (patientId !== undefined && !/^[1-9]\d*$/.test(patientId)) {
      throw new BadRequestException('patientId debe ser un entero positivo');
    }
    return this.service.list(unread === 'true', patientId === undefined ? undefined : Number(patientId));
  }
  @Patch(':id/read') read(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) { return this.service.markRead(id, req.user.id); }
}

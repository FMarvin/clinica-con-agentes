import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { AppointmentsService } from './appointments.service';

type AuthRequest = Request & { user: { id: number } };
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}
  @Get() list(@Query('patientId') patientId?: string) {
    if (patientId !== undefined && !/^[1-9]\d*$/.test(patientId)) throw new BadRequestException('patientId debe ser un entero positivo');
    return this.service.list(patientId === undefined ? undefined : Number(patientId));
  }
  @Post() create(@Body() dto: CreateAppointmentDto, @Req() req: AuthRequest) { return this.service.create(dto, req.user.id); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAppointmentDto, @Req() req: AuthRequest) { return this.service.update(id, dto, req.user.id); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) { return this.service.remove(id, req.user.id); }
}

import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { CreatePrescriptionDto, UpdatePrescriptionStatusDto } from './dto/prescription.dto';
import { PrescriptionsService } from './prescriptions.service';

type AuthRequest = Request & { user: { id: number } };
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}
  @Get() list(@Query('patientId') patientId?: string) {
    if (patientId !== undefined && !/^[1-9]\d*$/.test(patientId)) throw new BadRequestException('patientId debe ser un entero positivo');
    return this.service.list(patientId === undefined ? undefined : Number(patientId));
  }
  @Post() create(@Body() dto: CreatePrescriptionDto, @Req() req: AuthRequest) { return this.service.create(dto, req.user.id); }
  @Patch(':id/status') updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePrescriptionStatusDto, @Req() req: AuthRequest) { return this.service.updateStatus(id, dto, req.user.id); }
}

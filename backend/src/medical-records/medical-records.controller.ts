import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { CreateMedicalRecordDto, UpdateMedicalRecordDto } from './dto/medical-record.dto';
import { MedicalRecordsService } from './medical-records.service';

type AuthRequest = Request & { user: { id: number } };
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly service: MedicalRecordsService) {}
  @Get() list(@Query('patientId') patientId?: string) {
    if (patientId !== undefined && !/^[1-9]\d*$/.test(patientId)) throw new BadRequestException('patientId debe ser un entero positivo');
    return this.service.list(patientId === undefined ? undefined : Number(patientId));
  }
  @Post() create(@Body() dto: CreateMedicalRecordDto, @Req() req: AuthRequest) { return this.service.create(dto, req.user.id); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMedicalRecordDto, @Req() req: AuthRequest) { return this.service.update(id, dto, req.user.id); }
}

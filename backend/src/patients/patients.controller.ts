import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';
import { IsBoolean, IsDefined } from 'class-validator';
import { CreateChronicConditionDto } from './dto/chronic-condition.dto';

type AuthRequest = Request & { user: { id: number; role: { code: string } } };
class DeceasedStatusDto {
  @IsDefined() @IsBoolean() isDeceased!: boolean;
}
@Controller('patients')
export class PatientsController {
  constructor(private readonly service: PatientsService) {}
  @Get() list() { return this.service.list(); }
  @Get(':id') get(@Param('id', ParseIntPipe) id: number) { return this.service.get(id); }
  @Post() create(@Body() dto: CreatePatientDto, @Req() req: AuthRequest) { return this.service.create(dto, req.user.id); }
  @Get(':id/conditions') conditions(@Param('id', ParseIntPipe) id: number) { return this.service.listConditions(id); }
  @Post(':id/conditions') addCondition(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateChronicConditionDto, @Req() req: AuthRequest) {
    if (req.user.role.code !== 'doctor') throw new ForbiddenException('Solo un doctor puede registrar diagnósticos');
    return this.service.addCondition(id, dto, req.user.id);
  }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePatientDto, @Req() req: AuthRequest) { return this.service.update(id, dto, req.user.id); }
  @Patch(':id/deceased') deceased(@Param('id', ParseIntPipe) id: number, @Body() dto: DeceasedStatusDto, @Req() req: AuthRequest) { return this.service.markDeceased(id, dto.isDeceased, req.user.id); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) { return this.service.remove(id, req.user.id); }
}

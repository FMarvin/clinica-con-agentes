import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { BloodType, DocumentType, Gender, Severity } from '../common/entities/catalog.entity';
import { ChronicCondition } from './entities/chronic-condition.entity';
import { Patient } from './entities/patient.entity';
import { PatientsController } from './patients.controller';
import { PatientsRepository } from './patients.repository';
import { PatientsService } from './patients.service';

@Module({
  imports: [TypeOrmModule.forFeature([Patient, ChronicCondition, DocumentType, Gender, BloodType, Severity]), AuditModule],
  controllers: [PatientsController],
  providers: [PatientsRepository, PatientsService],
  exports: [PatientsService, PatientsRepository],
})
export class PatientsModule {}

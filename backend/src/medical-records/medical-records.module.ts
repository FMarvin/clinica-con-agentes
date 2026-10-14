import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsModule } from '../alerts/alerts.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AuditModule } from '../audit/audit.module';
import { PatientsModule } from '../patients/patients.module';
import { UsersModule } from '../users/users.module';
import { MedicalRecord } from './entities/medical-record.entity';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsRepository } from './medical-records.repository';
import { MedicalRecordsService } from './medical-records.service';

@Module({
  imports: [TypeOrmModule.forFeature([MedicalRecord, Appointment]), AlertsModule, AppointmentsModule, AuditModule, PatientsModule, UsersModule],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsRepository, MedicalRecordsService],
})
export class MedicalRecordsModule {}

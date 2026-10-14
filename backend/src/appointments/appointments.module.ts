import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AppointmentStatus } from '../common/entities/catalog.entity';
import { PatientsModule } from '../patients/patients.module';
import { UsersModule } from '../users/users.module';
import { Appointment } from './entities/appointment.entity';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, AppointmentStatus]), PatientsModule, UsersModule, AuditModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsRepository, AppointmentsService],
})
export class AppointmentsModule {}

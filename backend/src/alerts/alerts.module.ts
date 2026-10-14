import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AlertSeverity, AlertType } from '../common/entities/catalog.entity';
import { PatientsModule } from '../patients/patients.module';
import { Alert } from './entities/alert.entity';
import { AlertsController } from './alerts.controller';
import { AlertsRepository } from './alerts.repository';
import { AlertsService } from './alerts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Alert, AlertType, AlertSeverity]), PatientsModule, AuditModule],
  controllers: [AlertsController],
  providers: [AlertsRepository, AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}

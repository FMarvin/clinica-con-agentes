import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsModule } from '../alerts/alerts.module';
import { AuditModule } from '../audit/audit.module';
import { MovementType, PrescriptionStatus } from '../common/entities/catalog.entity';
import { MedicalRecord } from '../medical-records/entities/medical-record.entity';
import { PatientsModule } from '../patients/patients.module';
import { Product, ProductMovement } from '../products/entities/product.entity';
import { UsersModule } from '../users/users.module';
import { Prescription, PrescriptionItem } from './entities/prescription.entity';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsRepository } from './prescriptions.repository';
import { PrescriptionsService } from './prescriptions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Prescription, PrescriptionItem, PrescriptionStatus, MedicalRecord, Product, ProductMovement, MovementType]),
    AlertsModule, AuditModule, PatientsModule, UsersModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsRepository, PrescriptionsService],
})
export class PrescriptionsModule {}

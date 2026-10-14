import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertSeverity, AlertType } from '../common/entities/catalog.entity';
import { Alert } from './entities/alert.entity';

@Injectable()
export class AlertsRepository {
  constructor(
    @InjectRepository(Alert) private readonly alerts: Repository<Alert>,
    @InjectRepository(AlertType) private readonly types: Repository<AlertType>,
    @InjectRepository(AlertSeverity) private readonly severities: Repository<AlertSeverity>,
  ) {}
  list(unreadOnly: boolean, patientId?: number): Promise<Alert[]> {
    const where = {
      ...(unreadOnly ? { isRead: false } : {}),
      ...(patientId !== undefined ? { patientId } : {}),
    };
    return this.alerts.find({ where, order: { createdAt: 'DESC' } });
  }
  byId(id: number): Promise<Alert | null> { return this.alerts.findOne({ where: { id } }); }
  type(code: string): Promise<AlertType | null> { return this.types.findOne({ where: { code, isActive: true } }); }
  severity(code: string): Promise<AlertSeverity | null> { return this.severities.findOne({ where: { code, isActive: true } }); }
  save(alert: Alert): Promise<Alert> { return this.alerts.save(alert); }
}

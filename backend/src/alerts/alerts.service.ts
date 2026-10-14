import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PatientsService } from '../patients/patients.service';
import { Alert } from './entities/alert.entity';
import { AlertsRepository } from './alerts.repository';

@Injectable()
export class AlertsService {
  constructor(private readonly repository: AlertsRepository, private readonly patients: PatientsService, private readonly audit: AuditService) {}
  async list(unreadOnly: boolean, patientId?: number) {
    return (await this.repository.list(unreadOnly, patientId)).map((a) => ({
      id: a.id, patientId: a.patientId, type: a.type.code, severity: a.severity.code,
      title: a.title, message: a.message, isRead: a.isRead, readAt: a.readAt, createdAt: a.createdAt,
    }));
  }
  async markRead(id: number, actorId: number) {
    const alert = await this.repository.byId(id);
    if (!alert) throw new NotFoundException('Alerta no encontrada');
    const oldValues = { isRead: alert.isRead, readAt: alert.readAt };
    alert.isRead = true;
    alert.readAt = new Date();
    alert.updatedBy = actorId;
    const saved = await this.repository.save(alert);
    await this.audit.record('update', 'alerts', actorId, id, { isRead: saved.isRead, readAt: saved.readAt }, oldValues);
    return { id: saved.id, isRead: saved.isRead, readAt: saved.readAt };
  }
  async triggerChronicPatient(patientId: number, actorId: number): Promise<void> {
    const patient = await this.patients.requirePatient(patientId);
    if (!patient.isChronic || patient.isDeceased) return;
    const type = await this.repository.type('chronic_patient');
    const severity = await this.repository.severity('high');
    if (!type || !severity) throw new InternalServerErrorException('Faltan los catálogos de alertas crónicas');
    const alert = await this.repository.save(Object.assign(new Alert(), {
      patientId, typeId: type.id, type, severityId: severity.id, severity,
      title: 'Seguimiento de paciente crónico',
      message: `Se actualizó información clínica del paciente ${patient.firstName} ${patient.lastName}.`,
      isRead: false, triggeredBy: actorId, createdBy: actorId, updatedBy: actorId,
    }));
    await this.audit.record('create', 'alerts', actorId, alert.id);
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AlertsService } from '../alerts/alerts.service';
import { PatientsService } from '../patients/patients.service';
import { UsersService } from '../users/users.service';
import { CreateMedicalRecordDto, UpdateMedicalRecordDto } from './dto/medical-record.dto';
import { MedicalRecord } from './entities/medical-record.entity';
import { MedicalRecordsRepository } from './medical-records.repository';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly repository: MedicalRecordsRepository, private readonly patients: PatientsService,
    private readonly users: UsersService, private readonly alerts: AlertsService, private readonly audit: AuditService,
  ) {}
  async list(patientId?: number) { return (await this.repository.list(patientId)).map((r) => this.toResponse(r)); }
  async create(dto: CreateMedicalRecordDto, actorId: number) {
    const patient = await this.patients.requirePatient(dto.patientId);
    if (patient.isDeceased) throw new BadRequestException('El historial de un paciente fallecido es de solo lectura');
    const doctor = await this.users.findActiveById(actorId);
    if (!doctor || doctor.role.code !== 'doctor') throw new BadRequestException('Solo un doctor puede registrar una consulta');
    const appointment = dto.appointmentId ? await this.repository.findAppointment(dto.appointmentId) : null;
    if (dto.appointmentId && (!appointment || appointment.patientId !== patient.id)) {
      throw new BadRequestException('La cita no existe o no corresponde al paciente');
    }
    const record = Object.assign(new MedicalRecord(), {
      patientId: patient.id, patient, doctorId: actorId, doctor, appointmentId: appointment?.id ?? null, appointment,
      consultationDate: new Date(dto.consultationDate), reason: dto.reason.trim(), diagnosis: dto.diagnosis ?? null,
      treatment: dto.treatment ?? null, notes: dto.notes ?? null, createdBy: actorId, updatedBy: actorId,
    });
    const saved = await this.repository.save(record);
    await this.audit.record('create', 'medical_records', actorId, saved.id);
    await this.alerts.triggerChronicPatient(patient.id, actorId);
    return this.toResponse(saved);
  }
  async update(id: number, dto: UpdateMedicalRecordDto, actorId: number) {
    const record = await this.repository.find(id);
    if (!record) throw new NotFoundException('Registro médico no encontrado');
    if (record.patient.isDeceased) throw new BadRequestException('El historial de un paciente fallecido es de solo lectura');
    if (record.doctorId !== actorId) throw new BadRequestException('Solo el doctor responsable puede modificar este registro');
    const oldValues = {
      consultationDate: record.consultationDate,
      reason: record.reason,
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      notes: record.notes,
    };
    record.consultationDate = dto.consultationDate ? new Date(dto.consultationDate) : record.consultationDate;
    record.reason = dto.reason?.trim() ?? record.reason;
    record.diagnosis = dto.diagnosis ?? record.diagnosis;
    record.treatment = dto.treatment ?? record.treatment;
    record.notes = dto.notes ?? record.notes;
    record.updatedBy = actorId;
    const saved = await this.repository.save(record);
    await this.audit.record('update', 'medical_records', actorId, id, {
      consultationDate: saved.consultationDate,
      reason: saved.reason,
      diagnosis: saved.diagnosis,
      treatment: saved.treatment,
      notes: saved.notes,
    }, oldValues);
    await this.alerts.triggerChronicPatient(record.patientId, actorId);
    return this.toResponse(saved);
  }
  private toResponse(r: MedicalRecord) {
    return { id: r.id, patientId: r.patientId, doctor: { id: r.doctor.id, fullName: r.doctor.fullName },
      appointmentId: r.appointmentId, consultationDate: r.consultationDate, reason: r.reason,
      diagnosis: r.diagnosis, treatment: r.treatment, notes: r.notes };
  }
}

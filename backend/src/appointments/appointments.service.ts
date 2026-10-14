import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PatientsService } from '../patients/patients.service';
import { UsersService } from '../users/users.service';
import { Appointment } from './entities/appointment.entity';
import { AppointmentsRepository } from './appointments.repository';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly repository: AppointmentsRepository, private readonly patients: PatientsService,
    private readonly users: UsersService, private readonly audit: AuditService,
  ) {}
  async list(patientId?: number) { return (await this.repository.list(patientId)).map((a) => this.toResponse(a)); }
  async create(dto: CreateAppointmentDto, actorId: number) {
    const patient = await this.patients.requirePatient(dto.patientId);
    if (patient.isDeceased) throw new BadRequestException('No se puede agendar una cita para un paciente fallecido');
    const doctor = await this.users.findActiveById(dto.doctorId);
    if (!doctor || doctor.role.code !== 'doctor') throw new BadRequestException('El usuario asignado debe tener rol de doctor');
    const status = await this.repository.status(dto.statusCode);
    if (!status) throw new BadRequestException('Estado de cita inválido');
    const saved = await this.repository.save(Object.assign(new Appointment(), {
      patientId: patient.id, patient, doctorId: doctor.id, doctor, scheduledAt: new Date(dto.scheduledAt),
      durationMinutes: dto.durationMinutes ?? 30, statusId: status.id, status,
      reason: dto.reason ?? null, notes: dto.notes ?? null, createdBy: actorId, updatedBy: actorId,
    }));
    await this.audit.record('create', 'appointments', actorId, saved.id);
    return this.toResponse(saved);
  }
  async update(id: number, dto: UpdateAppointmentDto, actorId: number) {
    const appointment = await this.repository.find(id);
    if (!appointment) throw new NotFoundException('Cita no encontrada');
    if (appointment.patient.isDeceased) throw new BadRequestException('No se puede modificar una cita de un paciente fallecido');
    const oldValues = {
      status: appointment.status.code,
      scheduledAt: appointment.scheduledAt,
      durationMinutes: appointment.durationMinutes,
      reason: appointment.reason,
      notes: appointment.notes,
    };
    if (dto.statusCode) {
      const status = await this.repository.status(dto.statusCode);
      if (!status) throw new BadRequestException('Estado de cita inválido');
      appointment.statusId = status.id; appointment.status = status;
    }
    appointment.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : appointment.scheduledAt;
    appointment.durationMinutes = dto.durationMinutes ?? appointment.durationMinutes;
    appointment.reason = dto.reason ?? appointment.reason;
    appointment.notes = dto.notes ?? appointment.notes;
    appointment.updatedBy = actorId;
    const saved = await this.repository.save(appointment);
    await this.audit.record('update', 'appointments', actorId, id, {
      status: saved.status.code,
      scheduledAt: saved.scheduledAt,
      durationMinutes: saved.durationMinutes,
      reason: saved.reason,
      notes: saved.notes,
    }, oldValues);
    return this.toResponse(saved);
  }
  async remove(id: number, actorId: number) {
    const appointment = await this.repository.find(id);
    if (!appointment) throw new NotFoundException('Cita no encontrada');
    await this.repository.remove(appointment);
    await this.audit.record('delete', 'appointments', actorId, id);
    return { id, deleted: true };
  }
  private toResponse(a: Appointment) {
    return { id: a.id, patient: { id: a.patient.id, firstName: a.patient.firstName, lastName: a.patient.lastName, isPriority: a.patient.isPriority },
      doctor: { id: a.doctor.id, fullName: a.doctor.fullName }, scheduledAt: a.scheduledAt,
      durationMinutes: a.durationMinutes, status: a.status.code, reason: a.reason, notes: a.notes };
  }
}

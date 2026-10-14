import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentStatus } from '../common/entities/catalog.entity';
import { Appointment } from './entities/appointment.entity';

@Injectable()
export class AppointmentsRepository {
  constructor(
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(AppointmentStatus) private readonly statuses: Repository<AppointmentStatus>,
  ) {}
  list(patientId?: number): Promise<Appointment[]> {
    const query = this.appointments.createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .leftJoinAndSelect('appointment.status', 'status')
      .where('patient.deleted_at IS NULL')
      .orderBy('patient.is_priority', 'DESC').addOrderBy('appointment.scheduled_at', 'ASC');
    if (patientId !== undefined) query.andWhere('appointment.patient_id = :patientId', { patientId });
    return query.getMany();
  }
  find(id: number): Promise<Appointment | null> { return this.appointments.findOne({ where: { id } }); }
  status(code: string): Promise<AppointmentStatus | null> { return this.statuses.findOne({ where: { code, isActive: true } }); }
  save(value: Appointment): Promise<Appointment> { return this.appointments.save(value); }
  remove(value: Appointment): Promise<void> { return this.appointments.remove(value).then(() => undefined); }
}

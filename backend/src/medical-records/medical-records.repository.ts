import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { MedicalRecord } from './entities/medical-record.entity';

@Injectable()
export class MedicalRecordsRepository {
  constructor(
    @InjectRepository(MedicalRecord) private readonly records: Repository<MedicalRecord>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
  ) {}
  list(patientId?: number): Promise<MedicalRecord[]> {
    const query = this.records.createQueryBuilder('record').leftJoinAndSelect('record.patient', 'patient')
      .leftJoinAndSelect('record.doctor', 'doctor').leftJoinAndSelect('record.appointment', 'appointment')
      .orderBy('record.consultation_date', 'DESC');
    if (patientId) query.where('record.patient_id = :patientId', { patientId });
    return query.getMany();
  }
  find(id: number): Promise<MedicalRecord | null> { return this.records.findOne({ where: { id } }); }
  findAppointment(id: number): Promise<Appointment | null> { return this.appointments.findOne({ where: { id } }); }
  save(record: MedicalRecord): Promise<MedicalRecord> { return this.records.save(record); }
}

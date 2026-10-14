import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'medical_records' })
export class MedicalRecord {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'patient_id' }) patientId!: number;
  @ManyToOne(() => Patient, { eager: true })
  @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ name: 'doctor_id' }) doctorId!: number;
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'doctor_id' }) doctor!: User;
  @Column({ name: 'appointment_id', type: 'int', nullable: true }) appointmentId!: number | null;
  @ManyToOne(() => Appointment, { nullable: true })
  @JoinColumn({ name: 'appointment_id' }) appointment!: Appointment | null;
  @Column({ name: 'consultation_date', type: 'datetime' }) consultationDate!: Date;
  @Column({ length: 255 }) reason!: string;
  @Column({ type: 'text', nullable: true }) diagnosis!: string | null;
  @Column({ type: 'text', nullable: true }) treatment!: string | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'int', nullable: true }) createdBy!: number | null;
  @Column({ name: 'updated_by', type: 'int', nullable: true }) updatedBy!: number | null;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt!: Date;
}

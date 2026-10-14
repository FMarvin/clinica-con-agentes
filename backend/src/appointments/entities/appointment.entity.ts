import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AppointmentStatus } from '../../common/entities/catalog.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'appointments' })
export class Appointment {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'patient_id' }) patientId!: number;
  @ManyToOne(() => Patient, { eager: true })
  @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ name: 'doctor_id' }) doctorId!: number;
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'doctor_id' }) doctor!: User;
  @Column({ name: 'scheduled_at', type: 'datetime' }) scheduledAt!: Date;
  @Column({ name: 'duration_minutes', default: 30 }) durationMinutes!: number;
  @Column({ name: 'status_id' }) statusId!: number;
  @ManyToOne(() => AppointmentStatus, { eager: true })
  @JoinColumn({ name: 'status_id' }) status!: AppointmentStatus;
  @Column({ type: 'varchar', length: 255, nullable: true }) reason!: string | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'int', nullable: true }) createdBy!: number | null;
  @Column({ name: 'updated_by', type: 'int', nullable: true }) updatedBy!: number | null;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt!: Date;
}

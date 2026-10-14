import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Severity } from '../../common/entities/catalog.entity';
import { Patient } from './patient.entity';

@Entity({ name: 'chronic_conditions' })
export class ChronicCondition {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'patient_id' }) patientId!: number;
  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ length: 150 }) name!: string;
  @Column({ name: 'diagnosed_at', type: 'date', nullable: true }) diagnosedAt!: string | null;
  @Column({ name: 'severity_id', type: 'int', nullable: true }) severityId!: number | null;
  @ManyToOne(() => Severity, { nullable: true, eager: true })
  @JoinColumn({ name: 'severity_id' }) severity!: Severity | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'int', nullable: true }) createdBy!: number | null;
  @Column({ name: 'updated_by', type: 'int', nullable: true }) updatedBy!: number | null;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt!: Date;
}

import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AlertSeverity, AlertType } from '../../common/entities/catalog.entity';

@Entity({ name: 'alerts' })
export class Alert {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'patient_id' }) patientId!: number;
  @Column({ name: 'type_id' }) typeId!: number;
  @ManyToOne(() => AlertType, { eager: true })
  @JoinColumn({ name: 'type_id' }) type!: AlertType;
  @Column({ name: 'severity_id' }) severityId!: number;
  @ManyToOne(() => AlertSeverity, { eager: true })
  @JoinColumn({ name: 'severity_id' }) severity!: AlertSeverity;
  @Column({ length: 150 }) title!: string;
  @Column({ type: 'text' }) message!: string;
  @Column({ name: 'is_read', default: false }) isRead!: boolean;
  @Column({ name: 'triggered_by', type: 'int', nullable: true }) triggeredBy!: number | null;
  @Column({ name: 'read_at', type: 'datetime', nullable: true }) readAt!: Date | null;
  @Column({ name: 'created_by', type: 'int', nullable: true }) createdBy!: number | null;
  @Column({ name: 'updated_by', type: 'int', nullable: true }) updatedBy!: number | null;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt!: Date;
}

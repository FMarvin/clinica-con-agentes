import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PrescriptionStatus } from '../../common/entities/catalog.entity';
import { MedicalRecord } from '../../medical-records/entities/medical-record.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'prescriptions' })
export class Prescription {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'medical_record_id' }) medicalRecordId!: number;
  @ManyToOne(() => MedicalRecord, { eager: true })
  @JoinColumn({ name: 'medical_record_id' }) medicalRecord!: MedicalRecord;
  @Column({ name: 'patient_id' }) patientId!: number;
  @ManyToOne(() => Patient, { eager: true })
  @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ name: 'doctor_id' }) doctorId!: number;
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'doctor_id' }) doctor!: User;
  @Column({ type: 'varchar', length: 50, nullable: true, unique: true }) code!: string | null;
  @Column({ name: 'issued_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }) issuedAt!: Date;
  @Column({ name: 'status_id' }) statusId!: number;
  @ManyToOne(() => PrescriptionStatus, { eager: true })
  @JoinColumn({ name: 'status_id' }) status!: PrescriptionStatus;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'int', nullable: true }) createdBy!: number | null;
  @Column({ name: 'updated_by', type: 'int', nullable: true }) updatedBy!: number | null;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt!: Date;
  @OneToMany(() => PrescriptionItem, (item) => item.prescription, { cascade: true, eager: true })
  items!: PrescriptionItem[];
}

@Entity({ name: 'prescription_items' })
export class PrescriptionItem {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'prescription_id' }) prescriptionId!: number;
  @ManyToOne(() => Prescription, (prescription) => prescription.items)
  @JoinColumn({ name: 'prescription_id' }) prescription!: Prescription;
  @Column({ name: 'product_id' }) productId!: number;
  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' }) product!: Product;
  @Column({ length: 100 }) dosage!: string;
  @Column({ length: 100 }) frequency!: string;
  @Column({ type: 'varchar', length: 50, nullable: true }) duration!: string | null;
  @Column({ default: 1 }) quantity!: number;
  @Column({ type: 'text', nullable: true }) instructions!: string | null;
  @Column({ name: 'created_by', type: 'int', nullable: true }) createdBy!: number | null;
  @Column({ name: 'updated_by', type: 'int', nullable: true }) updatedBy!: number | null;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt!: Date;
}

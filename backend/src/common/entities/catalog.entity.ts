import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

abstract class CatalogEntry {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ length: 80 }) name!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) description!: string | null;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'sort_order', default: 0 }) sortOrder!: number;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt!: Date;
}

@Entity({ name: 'enum_document_types' })
export class DocumentType extends CatalogEntry { @Column({ length: 30, unique: true }) code!: string; }

@Entity({ name: 'enum_genders' })
export class Gender extends CatalogEntry { @Column({ length: 20, unique: true }) code!: string; }

@Entity({ name: 'enum_blood_types' })
export class BloodType extends CatalogEntry { @Column({ length: 5, unique: true }) code!: string; }

@Entity({ name: 'enum_severities' })
export class Severity extends CatalogEntry { @Column({ length: 20, unique: true }) code!: string; }

@Entity({ name: 'enum_prescription_statuses' })
export class PrescriptionStatus extends CatalogEntry { @Column({ length: 20, unique: true }) code!: string; }

@Entity({ name: 'enum_appointment_statuses' })
export class AppointmentStatus extends CatalogEntry { @Column({ length: 20, unique: true }) code!: string; }

@Entity({ name: 'enum_alert_types' })
export class AlertType extends CatalogEntry { @Column({ length: 30, unique: true }) code!: string; }

@Entity({ name: 'enum_alert_severities' })
export class AlertSeverity extends CatalogEntry { @Column({ length: 20, unique: true }) code!: string; }

@Entity({ name: 'enum_product_types' })
export class ProductType extends CatalogEntry { @Column({ length: 20, unique: true }) code!: string; }

@Entity({ name: 'enum_movement_types' })
export class MovementType extends CatalogEntry { @Column({ length: 20, unique: true }) code!: string; }

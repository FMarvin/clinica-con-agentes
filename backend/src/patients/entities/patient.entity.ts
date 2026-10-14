import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BloodType, DocumentType, Gender } from '../../common/entities/catalog.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'patients' })
export class Patient {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'document_type_id' }) documentTypeId!: number;
  @ManyToOne(() => DocumentType, { eager: true })
  @JoinColumn({ name: 'document_type_id' }) documentType!: DocumentType;
  @Column({ name: 'document_number', length: 30, unique: true }) documentNumber!: string;
  @Column({ name: 'first_name', length: 100 }) firstName!: string;
  @Column({ name: 'last_name', length: 100 }) lastName!: string;
  @Column({ name: 'birth_date', type: 'date' }) birthDate!: string;
  @Column({ name: 'gender_id', type: 'int', nullable: true }) genderId!: number | null;
  @ManyToOne(() => Gender, { nullable: true, eager: true })
  @JoinColumn({ name: 'gender_id' }) gender!: Gender | null;
  @Column({ type: 'varchar', length: 30, nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', length: 150, nullable: true }) email!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) address!: string | null;
  @Column({ name: 'blood_type_id', type: 'int', nullable: true }) bloodTypeId!: number | null;
  @ManyToOne(() => BloodType, { nullable: true, eager: true })
  @JoinColumn({ name: 'blood_type_id' }) bloodType!: BloodType | null;
  @Column({ type: 'text', nullable: true }) allergies!: string | null;
  @Column({ name: 'is_chronic', default: false }) isChronic!: boolean;
  @Column({ name: 'is_priority', default: false }) isPriority!: boolean;
  @Column({ name: 'is_deceased', default: false }) isDeceased!: boolean;
  @Column({ name: 'deceased_at', type: 'datetime', nullable: true }) deceasedAt!: Date | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'int', nullable: true }) createdBy!: number | null;
  @Column({ name: 'updated_by', type: 'int', nullable: true }) updatedBy!: number | null;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt!: Date;
  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true }) deletedAt!: Date | null;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' }) creator!: User | null;
}

import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ length: 150, unique: true }) email!: string;
  @Column({ name: 'password_hash', length: 255, select: false }) passwordHash!: string;
  @Column({ name: 'full_name', length: 150 }) fullName!: string;
  @Column({ name: 'role_id' }) roleId!: number;
  @ManyToOne(() => Role, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'role_id' }) role!: Role;
  @Column({ type: 'varchar', length: 30, nullable: true }) phone!: string | null;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'last_login_at', type: 'datetime', nullable: true }) lastLoginAt!: Date | null;
  @Column({ name: 'password_changed_at', type: 'datetime', nullable: true }) passwordChangedAt!: Date | null;
  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true }) deletedAt!: Date | null;
  @Column({ name: 'created_by', type: 'int', nullable: true }) createdBy!: number | null;
  @Column({ name: 'updated_by', type: 'int', nullable: true }) updatedBy!: number | null;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt!: Date;
}

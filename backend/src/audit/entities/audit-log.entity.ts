import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'user_id', type: 'int', nullable: true }) userId!: number | null;
  @Column({ length: 80 }) action!: string;
  @Column({ length: 80 }) entity!: string;
  @Column({ name: 'entity_id', length: 50 }) entityId!: string;
  @Column({ name: 'old_values', type: 'json', nullable: true }) oldValues!: Record<string, unknown> | null;
  @Column({ name: 'new_values', type: 'json', nullable: true }) newValues!: Record<string, unknown> | null;
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true }) ipAddress!: string | null;
  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true }) userAgent!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}

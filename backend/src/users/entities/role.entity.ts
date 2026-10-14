import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'enum_roles' })
export class Role {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ length: 30, unique: true }) code!: string;
  @Column({ length: 80 }) name!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) description!: string | null;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'sort_order', default: 0 }) sortOrder!: number;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt!: Date;
  @OneToMany(() => User, (user) => user.role) users!: User[];
}

import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProductType } from '../../common/entities/catalog.entity';

@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ length: 50, unique: true }) sku!: string;
  @Column({ length: 200 }) name!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ name: 'type_id' }) typeId!: number;
  @ManyToOne(() => ProductType, { eager: true })
  @JoinColumn({ name: 'type_id' }) type!: ProductType;
  @Column({ type: 'varchar', length: 100, nullable: true }) category!: string | null;
  @Column({ type: 'varchar', length: 150, nullable: true }) laboratory!: string | null;
  @Column({ type: 'varchar', length: 30, nullable: true }) unit!: string | null;
  @Column({ default: 0 }) stock!: number;
  @Column({ name: 'min_stock', default: 0 }) minStock!: number;
  @Column({ name: 'requires_prescription', default: false }) requiresPrescription!: boolean;
  @Column({ name: 'expiration_date', type: 'date', nullable: true }) expirationDate!: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) price!: string | null;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'created_by', type: 'int', nullable: true }) createdBy!: number | null;
  @Column({ name: 'updated_by', type: 'int', nullable: true }) updatedBy!: number | null;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt!: Date;
}

@Entity({ name: 'product_movements' })
export class ProductMovement {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'product_id' }) productId!: number;
  @Column({ name: 'type_id' }) typeId!: number;
  @Column() quantity!: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) reason!: string | null;
  @Column({ name: 'reference_id', type: 'int', nullable: true }) referenceId!: number | null;
  @Column({ name: 'performed_by', type: 'int', nullable: true }) performedBy!: number | null;
  @Column({ name: 'created_by', type: 'int', nullable: true }) createdBy!: number | null;
  @Column({ name: 'updated_by', type: 'int', nullable: true }) updatedBy!: number | null;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt!: Date;
}

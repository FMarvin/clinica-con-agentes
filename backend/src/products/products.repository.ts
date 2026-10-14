import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MovementType, ProductType } from '../common/entities/catalog.entity';
import { Product, ProductMovement } from './entities/product.entity';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductMovement) private readonly movements: Repository<ProductMovement>,
    @InjectRepository(ProductType) private readonly types: Repository<ProductType>,
    @InjectRepository(MovementType) private readonly movementTypes: Repository<MovementType>,
    private readonly dataSource: DataSource,
  ) {}
  list(): Promise<Product[]> { return this.products.find({ where: { isActive: true }, order: { name: 'ASC' } }); }
  find(id: number): Promise<Product | null> { return this.products.findOne({ where: { id } }); }
  findBySku(sku: string): Promise<Product | null> { return this.products.findOne({ where: { sku } }); }
  type(code: string): Promise<ProductType | null> { return this.types.findOne({ where: { code, isActive: true } }); }
  movementType(code: string): Promise<MovementType | null> { return this.movementTypes.findOne({ where: { code, isActive: true } }); }
  save(product: Product): Promise<Product> { return this.products.save(product); }
  async adjustStock(product: Product, delta: number, movement: ProductMovement): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(Product, { where: { id: product.id }, lock: { mode: 'pessimistic_write' } });
      if (!current) throw new NotFoundException('Producto no encontrado');
      if (current.stock + delta < 0) throw new BadRequestException('No hay existencias suficientes');
      current.stock += delta;
      await manager.save(current);
      await manager.save(ProductMovement, movement);
      return current;
    });
  }
}

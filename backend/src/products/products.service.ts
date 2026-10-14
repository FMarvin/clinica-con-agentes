import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Product, ProductMovement } from './entities/product.entity';
import { CreateProductDto, ProductMovementDto, UpdateProductDto } from './dto/product.dto';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly repository: ProductsRepository, private readonly audit: AuditService) {}
  async list() { return (await this.repository.list()).map((p) => this.toResponse(p)); }
  async create(dto: CreateProductDto, actorId: number) {
    if (await this.repository.findBySku(dto.sku)) throw new ConflictException('El código SKU ya existe');
    const type = await this.repository.type(dto.typeCode);
    if (!type) throw new BadRequestException('Tipo de producto inválido');
    const product = await this.repository.save(Object.assign(new Product(), {
      sku: dto.sku, name: dto.name.trim(), description: dto.description ?? null, typeId: type.id, type,
      category: dto.category ?? null, laboratory: dto.laboratory ?? null, unit: dto.unit ?? null,
      stock: 0, minStock: dto.minStock ?? 0,
      requiresPrescription: type.code !== 'sample' && (dto.requiresPrescription ?? false),
      expirationDate: dto.expirationDate ?? null, price: dto.price === undefined ? null : String(dto.price),
      isActive: true, createdBy: actorId, updatedBy: actorId,
    }));
    await this.audit.record('create', 'products', actorId, product.id);
    return this.toResponse(product);
  }
  async update(id: number, dto: UpdateProductDto, actorId: number) {
    const product = await this.requireProduct(id);
    const oldValues = this.toResponse(product);
    if (dto.typeCode) {
      const type = await this.repository.type(dto.typeCode);
      if (!type) throw new BadRequestException('Tipo de producto inválido');
      product.typeId = type.id; product.type = type;
    }
    Object.assign(product, {
      name: dto.name?.trim() ?? product.name,
      description: dto.description === undefined ? product.description : dto.description,
      category: dto.category === undefined ? product.category : dto.category,
      laboratory: dto.laboratory === undefined ? product.laboratory : dto.laboratory,
      unit: dto.unit === undefined ? product.unit : dto.unit, minStock: dto.minStock ?? product.minStock,
      requiresPrescription: dto.requiresPrescription ?? product.requiresPrescription,
      expirationDate: dto.expirationDate === undefined ? product.expirationDate : dto.expirationDate,
      price: dto.price === undefined ? product.price : dto.price === null ? null : String(dto.price),
      isActive: dto.isActive ?? product.isActive,
      updatedBy: actorId,
    });
    if (product.type.code === 'sample') product.requiresPrescription = false;
    const saved = await this.repository.save(product);
    await this.audit.record('update', 'products', actorId, id, this.toResponse(saved), oldValues);
    return this.toResponse(saved);
  }
  async move(id: number, dto: ProductMovementDto, actorId: number) {
    const product = await this.requireProduct(id);
    const type = await this.repository.movementType(dto.movementCode);
    if (!type || !['in', 'out', 'adjustment'].includes(type.code)) throw new BadRequestException('Tipo de movimiento inválido');
    const delta = type.code === 'in' ? dto.quantity : type.code === 'out' ? -dto.quantity : 0;
    if (type.code === 'adjustment') throw new BadRequestException('Use entradas o salidas para modificar existencias');
    const oldValues = { stock: product.stock };
    const movement = Object.assign(new ProductMovement(), {
      productId: id, typeId: type.id, quantity: dto.quantity, reason: dto.reason ?? null,
      performedBy: actorId, createdBy: actorId, updatedBy: actorId,
    });
    const saved = await this.repository.adjustStock(product, delta, movement);
    await this.audit.record('update', 'products', actorId, id, { stock: saved.stock }, oldValues);
    await this.audit.record('create', 'product_movements', actorId, movement.id, {
      productId: id,
      type: type.code,
      quantity: dto.quantity,
      reason: dto.reason ?? null,
      stockBefore: oldValues.stock,
      stockAfter: saved.stock,
    });
    return { productId: saved.id, stock: saved.stock, movement: { id: movement.id, type: type.code, quantity: dto.quantity } };
  }
  async deactivate(id: number, actorId: number) {
    const product = await this.requireProduct(id);
    const oldValues = { isActive: product.isActive };
    product.isActive = false; product.updatedBy = actorId;
    await this.repository.save(product);
    await this.audit.record('update', 'products', actorId, id, { isActive: false }, oldValues);
    return { id, isActive: false };
  }
  private async requireProduct(id: number) {
    const product = await this.repository.find(id);
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }
  private toResponse(p: Product) {
    return { id: p.id, sku: p.sku, name: p.name, description: p.description, type: p.type.code,
      category: p.category, laboratory: p.laboratory, unit: p.unit, stock: p.stock, minStock: p.minStock,
      requiresPrescription: p.requiresPrescription, expirationDate: p.expirationDate, price: p.price, isActive: p.isActive };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MovementType, PrescriptionStatus } from '../common/entities/catalog.entity';
import { MedicalRecord } from '../medical-records/entities/medical-record.entity';
import { Product, ProductMovement } from '../products/entities/product.entity';
import { Prescription, PrescriptionItem } from './entities/prescription.entity';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';

@Injectable()
export class PrescriptionsRepository {
  constructor(
    @InjectRepository(Prescription) private readonly prescriptions: Repository<Prescription>,
    @InjectRepository(PrescriptionItem) private readonly items: Repository<PrescriptionItem>,
    @InjectRepository(PrescriptionStatus) private readonly statuses: Repository<PrescriptionStatus>,
    @InjectRepository(MedicalRecord) private readonly records: Repository<MedicalRecord>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(MovementType) private readonly movementTypes: Repository<MovementType>,
    private readonly dataSource: DataSource,
  ) {}
  list(patientId?: number): Promise<Prescription[]> {
    const where = patientId === undefined ? {} : { patientId };
    return this.prescriptions.find({ where, order: { issuedAt: 'DESC' } });
  }
  find(id: number): Promise<Prescription | null> { return this.prescriptions.findOne({ where: { id } }); }
  findByCode(code: string): Promise<Prescription | null> { return this.prescriptions.findOne({ where: { code } }); }
  findRecord(id: number): Promise<MedicalRecord | null> { return this.records.findOne({ where: { id } }); }
  findProduct(id: number): Promise<Product | null> { return this.products.findOne({ where: { id, isActive: true } }); }
  status(code: string): Promise<PrescriptionStatus | null> { return this.statuses.findOne({ where: { code, isActive: true } }); }
  save(prescription: Prescription): Promise<Prescription> { return this.prescriptions.save(prescription); }
  async changeStatus(id: number, statusCode: string, actorId: number): Promise<{ prescription: Prescription; movements: ProductMovement[] }> {
    return this.dataSource.transaction(async (manager) => {
      const loadForResponse = async () => {
        const result = await manager.getRepository(Prescription).findOne({
          where: { id },
          relations: { medicalRecord: true, patient: true, doctor: true, status: true, items: { product: true } },
        });
        if (!result) throw new NotFoundException('Receta no encontrada');
        return result;
      };
      const prescription = await manager.createQueryBuilder(Prescription, 'prescription')
        .leftJoinAndSelect('prescription.status', 'status')
        .leftJoinAndSelect('prescription.items', 'item')
        .leftJoinAndSelect('item.product', 'product')
        .where('prescription.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();
      if (!prescription) throw new NotFoundException('Receta no encontrada');
      if (prescription.status.code === statusCode) return { prescription: await loadForResponse(), movements: [] };
      if (prescription.status.code !== 'issued' || !['dispensed', 'cancelled'].includes(statusCode)) {
        throw new BadRequestException('Solo se puede despachar o cancelar una receta emitida');
      }

      const nextStatus = await manager.getRepository(PrescriptionStatus).findOne({ where: { code: statusCode, isActive: true } });
      if (!nextStatus) throw new BadRequestException('Estado de receta inválido');

      const movements: ProductMovement[] = [];
      if (statusCode === 'dispensed') {
        const movementType = await manager.getRepository(MovementType).findOne({ where: { code: 'out', isActive: true } });
        if (!movementType) throw new InternalServerErrorException('No está configurado el movimiento de salida de inventario');
        const requiredByProduct = new Map<number, number>();
        for (const item of prescription.items) {
          requiredByProduct.set(item.productId, (requiredByProduct.get(item.productId) ?? 0) + item.quantity);
        }

        for (const [productId, quantity] of [...requiredByProduct.entries()].sort(([first], [second]) => first - second)) {
          const product = await manager.getRepository(Product).findOne({
            where: { id: productId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!product || !product.isActive) throw new BadRequestException('Un producto de la receta ya no está disponible');
          if (product.stock < quantity) {
            throw new BadRequestException(
              `Existencias insuficientes de ${product.name}: disponibles ${product.stock}, requeridas ${quantity}`,
            );
          }
          product.stock -= quantity;
          product.updatedBy = actorId;
          await manager.save(Product, product);
          movements.push(await manager.save(ProductMovement, manager.create(ProductMovement, {
            productId,
            typeId: movementType.id,
            quantity,
            reason: `Despacho de receta #${prescription.id}`,
            referenceId: prescription.id,
            performedBy: actorId,
            createdBy: actorId,
            updatedBy: actorId,
          })));
        }
      }

      prescription.statusId = nextStatus.id;
      prescription.status = nextStatus;
      prescription.updatedBy = actorId;
      await manager.save(Prescription, prescription);
      return { prescription: await loadForResponse(), movements };
    });
  }
}

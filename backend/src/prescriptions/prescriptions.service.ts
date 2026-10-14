import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AlertsService } from '../alerts/alerts.service';
import { PatientsService } from '../patients/patients.service';
import { UsersService } from '../users/users.service';
import { CreatePrescriptionDto, UpdatePrescriptionStatusDto } from './dto/prescription.dto';
import { Prescription, PrescriptionItem } from './entities/prescription.entity';
import { PrescriptionsRepository } from './prescriptions.repository';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly repository: PrescriptionsRepository, private readonly patients: PatientsService,
    private readonly users: UsersService, private readonly alerts: AlertsService, private readonly audit: AuditService,
  ) {}
  async list(patientId?: number) { return (await this.repository.list(patientId)).map((p) => this.toResponse(p)); }
  async create(dto: CreatePrescriptionDto, actorId: number) {
    const doctor = await this.users.findActiveById(actorId);
    if (!doctor || doctor.role.code !== 'doctor') throw new BadRequestException('Solo un doctor puede emitir recetas');
    const patient = await this.patients.requirePatient(dto.patientId);
    if (patient.isDeceased) throw new BadRequestException('No se pueden emitir recetas a pacientes fallecidos');
    const record = await this.repository.findRecord(dto.medicalRecordId);
    if (!record || record.patientId !== patient.id) throw new BadRequestException('El registro médico no corresponde al paciente');
    if (record.doctorId !== actorId) throw new BadRequestException('La receta debe corresponder a una consulta del doctor emisor');
    if (dto.code && await this.repository.findByCode(dto.code)) throw new ConflictException('El código de receta ya existe');
    const status = await this.repository.status('issued');
    if (!status) throw new BadRequestException('No está configurado el estado inicial de las recetas');
    if (dto.items.length === 0) throw new BadRequestException('La receta debe incluir al menos un producto');
    const items: PrescriptionItem[] = [];
    for (const input of dto.items) {
      const product = await this.repository.findProduct(input.productId);
      if (!product) throw new BadRequestException(`Producto ${input.productId} no encontrado o inactivo`);
      if (product.type.code === 'sample') throw new BadRequestException('Las muestras médicas no requieren ni se incluyen en recetas');
      items.push(Object.assign(new PrescriptionItem(), {
        productId: product.id, product, dosage: input.dosage, frequency: input.frequency,
        duration: input.duration ?? null, quantity: input.quantity, instructions: input.instructions ?? null,
        createdBy: actorId, updatedBy: actorId,
      }));
    }
    const prescription = await this.repository.save(Object.assign(new Prescription(), {
      medicalRecordId: record.id, medicalRecord: record, patientId: patient.id, patient,
      doctorId: doctor.id, doctor, code: dto.code ?? null, issuedAt: new Date(),
      statusId: status.id, status, notes: dto.notes ?? null, createdBy: actorId, updatedBy: actorId, items,
    }));
    await this.audit.record('create', 'prescriptions', actorId, prescription.id);
    await this.alerts.triggerChronicPatient(patient.id, actorId);
    return this.toResponse(prescription);
  }
  async updateStatus(id: number, dto: UpdatePrescriptionStatusDto, actorId: number) {
    const prescription = await this.repository.find(id);
    if (!prescription) throw new NotFoundException('Receta no encontrada');
    const actor = await this.users.findActiveById(actorId);
    if (!actor) throw new BadRequestException('El usuario no está activo');
    if (dto.statusCode === 'dispensed') {
      const mayDispense = actor.role.code === 'pharmacist'
        || (actor.role.code === 'doctor' && prescription.doctorId === actorId);
      if (!mayDispense) throw new BadRequestException('Solo el farmacéutico o el doctor emisor puede despachar esta receta');
    } else if (dto.statusCode === 'cancelled') {
      if (actor.role.code !== 'doctor' || prescription.doctorId !== actorId) {
        throw new BadRequestException('Solo el doctor emisor puede cancelar esta receta');
      }
    } else {
      throw new BadRequestException('Solo se puede despachar o cancelar una receta emitida');
    }
    const oldValues = { status: prescription.status.code };
    const status = await this.repository.status(dto.statusCode);
    if (!status) throw new BadRequestException('Estado de receta inválido');
    prescription.statusId = status.id; prescription.status = status; prescription.updatedBy = actorId;
    const result = await this.repository.changeStatus(id, dto.statusCode, actorId);
    await this.audit.record('update', 'prescriptions', actorId, id, { status: result.prescription.status.code }, oldValues);
    for (const movement of result.movements) {
      await this.audit.record('create', 'product_movements', actorId, movement.id, {
        productId: movement.productId, quantity: movement.quantity, referenceId: movement.referenceId,
      });
    }
    return this.toResponse(result.prescription);
  }
  private toResponse(p: Prescription) {
    return { id: p.id, code: p.code, patientId: p.patientId,
      doctor: { id: p.doctor.id, fullName: p.doctor.fullName }, medicalRecordId: p.medicalRecordId,
      issuedAt: p.issuedAt, status: p.status.code, notes: p.notes,
      items: (p.items ?? []).map((i) => ({ id: i.id, product: { id: i.product.id, sku: i.product.sku, name: i.product.name },
        dosage: i.dosage, frequency: i.frequency, duration: i.duration, quantity: i.quantity, instructions: i.instructions })) };
  }
}

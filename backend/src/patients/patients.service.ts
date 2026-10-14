import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateChronicConditionDto } from './dto/chronic-condition.dto';
import { ChronicCondition } from './entities/chronic-condition.entity';
import { Patient } from './entities/patient.entity';
import { PatientsRepository } from './patients.repository';

@Injectable()
export class PatientsService {
  constructor(private readonly repository: PatientsRepository, private readonly audit: AuditService) {}
  async list() { return (await this.repository.findAll()).map((p) => this.toResponse(p)); }
  async get(id: number) { return this.toResponse(await this.requirePatient(id)); }
  async listConditions(patientId: number) {
    await this.requirePatient(patientId);
    return (await this.repository.findConditions(patientId)).map((condition) => this.toConditionResponse(condition));
  }
  async addCondition(patientId: number, dto: CreateChronicConditionDto, actorId: number) {
    const patient = await this.requirePatient(patientId);
    if (patient.isDeceased) throw new BadRequestException('No se pueden agregar diagnósticos a un paciente fallecido');
    const severity = dto.severityCode ? await this.repository.findSeverity(dto.severityCode) : null;
    if (dto.severityCode && !severity) throw new BadRequestException('Nivel de severidad inválido');
    const condition = await this.repository.saveCondition(Object.assign(new ChronicCondition(), {
      patientId, patient, name: dto.name.trim(), diagnosedAt: dto.diagnosedAt ?? null,
      severityId: severity?.id ?? null, severity, notes: dto.notes ?? null, createdBy: actorId, updatedBy: actorId,
    }));
    if (!patient.isChronic) {
      patient.isChronic = true;
      patient.updatedBy = actorId;
      await this.repository.save(patient);
      await this.audit.record('update', 'patients', actorId, patientId, { isChronic: true });
    }
    await this.audit.record('create', 'chronic_conditions', actorId, condition.id);
    return this.toConditionResponse(condition);
  }
  async create(dto: CreatePatientDto, actorId: number) {
    if (await this.repository.findByDocument(dto.documentNumber)) throw new ConflictException('Ya existe un paciente con ese documento');
    const documentType = await this.repository.findDocumentType(dto.documentTypeCode);
    if (!documentType) throw new BadRequestException('Tipo de documento inválido');
    const gender = dto.genderCode ? await this.repository.findGender(dto.genderCode) : null;
    if (dto.genderCode && !gender) throw new BadRequestException('Género inválido');
    const bloodType = dto.bloodTypeCode ? await this.repository.findBloodType(dto.bloodTypeCode) : null;
    if (dto.bloodTypeCode && !bloodType) throw new BadRequestException('Tipo de sangre inválido');
    const patient = await this.repository.save(Object.assign(new Patient(), {
      documentTypeId: documentType.id, documentType, documentNumber: dto.documentNumber, firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(), birthDate: dto.birthDate, genderId: gender?.id ?? null, gender,
      phone: dto.phone ?? null, email: dto.email?.toLowerCase() ?? null, address: dto.address ?? null,
      bloodTypeId: bloodType?.id ?? null, bloodType, allergies: dto.allergies ?? null,
      isChronic: dto.isChronic ?? false, isPriority: dto.isPriority ?? false,
      isDeceased: false, deceasedAt: null, notes: dto.notes ?? null, createdBy: actorId, updatedBy: actorId,
    }));
    await this.audit.record('create', 'patients', actorId, patient.id);
    return this.toResponse(patient);
  }
  async update(id: number, dto: UpdatePatientDto, actorId: number) {
    const patient = await this.requirePatient(id);
    if (patient.isDeceased) throw new BadRequestException('No se puede modificar el expediente de un paciente fallecido');
    if (dto.isChronic === false && await this.repository.countConditions(id)) {
      throw new BadRequestException('No se puede quitar el seguimiento mientras existan diagnósticos crónicos registrados');
    }
    const oldValues = {
      ...(dto.firstName !== undefined ? { firstName: patient.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: patient.lastName } : {}),
      ...(dto.birthDate !== undefined ? { birthDate: patient.birthDate } : {}),
      ...(dto.genderCode !== undefined ? { gender: patient.gender?.code ?? null } : {}),
      ...(dto.phone !== undefined ? { phone: patient.phone } : {}),
      ...(dto.email !== undefined ? { email: patient.email } : {}),
      ...(dto.address !== undefined ? { address: patient.address } : {}),
      ...(dto.bloodTypeCode !== undefined ? { bloodType: patient.bloodType?.code ?? null } : {}),
      ...(dto.allergies !== undefined ? { allergies: patient.allergies } : {}),
      ...(dto.isChronic !== undefined ? { isChronic: patient.isChronic } : {}),
      ...(dto.isPriority !== undefined ? { isPriority: patient.isPriority } : {}),
      ...(dto.notes !== undefined ? { notes: patient.notes } : {}),
    };
    if (dto.genderCode !== undefined) {
      const gender = dto.genderCode ? await this.repository.findGender(dto.genderCode) : null;
      if (dto.genderCode && !gender) throw new BadRequestException('Género inválido');
      patient.genderId = gender?.id ?? null; patient.gender = gender;
    }
    if (dto.bloodTypeCode !== undefined) {
      const type = dto.bloodTypeCode ? await this.repository.findBloodType(dto.bloodTypeCode) : null;
      if (dto.bloodTypeCode && !type) throw new BadRequestException('Tipo de sangre inválido');
      patient.bloodTypeId = type?.id ?? null; patient.bloodType = type;
    }
    Object.assign(patient, {
      firstName: dto.firstName?.trim() ?? patient.firstName, lastName: dto.lastName?.trim() ?? patient.lastName,
      birthDate: dto.birthDate ?? patient.birthDate,
      phone: dto.phone === undefined ? patient.phone : dto.phone,
      email: dto.email === undefined ? patient.email : dto.email?.toLowerCase() ?? null,
      address: dto.address === undefined ? patient.address : dto.address,
      allergies: dto.allergies === undefined ? patient.allergies : dto.allergies,
      isChronic: dto.isChronic ?? patient.isChronic,
      isPriority: dto.isPriority ?? patient.isPriority,
      notes: dto.notes === undefined ? patient.notes : dto.notes, updatedBy: actorId,
    });
    const saved = await this.repository.save(patient);
    const newValues = Object.fromEntries(Object.keys(oldValues).map((key) => [
      key,
      key === 'gender' ? saved.gender?.code ?? null : key === 'bloodType' ? saved.bloodType?.code ?? null : saved[key as keyof Patient],
    ]));
    await this.audit.record('update', 'patients', actorId, id, newValues, oldValues);
    return this.toResponse(saved);
  }
  async markDeceased(id: number, deceased: boolean, actorId: number) {
    const patient = await this.requirePatient(id);
    const oldValues = { isDeceased: patient.isDeceased, deceasedAt: patient.deceasedAt };
    patient.isDeceased = deceased;
    patient.deceasedAt = deceased ? (patient.deceasedAt ?? new Date()) : null;
    patient.updatedBy = actorId;
    const saved = await this.repository.save(patient);
    await this.audit.record('update', 'patients', actorId, id, { isDeceased: saved.isDeceased, deceasedAt: saved.deceasedAt }, oldValues);
    return this.toResponse(saved);
  }
  async remove(id: number, actorId: number) {
    const patient = await this.requirePatient(id);
    patient.deletedAt = new Date();
    patient.updatedBy = actorId;
    await this.repository.save(patient);
    await this.audit.record('delete', 'patients', actorId, id);
    return { id, deleted: true };
  }
  async requirePatient(id: number): Promise<Patient> {
    const patient = await this.repository.findById(id);
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    return patient;
  }
  private toResponse(p: Patient) {
    return {
      id: p.id, documentType: p.documentType?.code, documentNumber: p.documentNumber, firstName: p.firstName,
      lastName: p.lastName, birthDate: p.birthDate, gender: p.gender?.code ?? null, phone: p.phone,
      email: p.email, address: p.address, bloodType: p.bloodType?.code ?? null, allergies: p.allergies,
      isChronic: p.isChronic, isPriority: p.isPriority, isDeceased: p.isDeceased, deceasedAt: p.deceasedAt,
      notes: p.notes, createdAt: p.createdAt, updatedAt: p.updatedAt,
    };
  }
  private toConditionResponse(condition: ChronicCondition) {
    return {
      id: condition.id, patientId: condition.patientId, name: condition.name,
      diagnosedAt: condition.diagnosedAt, severity: condition.severity?.code ?? null,
      notes: condition.notes, createdAt: condition.createdAt,
    };
  }
}

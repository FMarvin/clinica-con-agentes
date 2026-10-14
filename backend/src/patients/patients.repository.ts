import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { BloodType, DocumentType, Gender, Severity } from '../common/entities/catalog.entity';
import { ChronicCondition } from './entities/chronic-condition.entity';
import { Patient } from './entities/patient.entity';

@Injectable()
export class PatientsRepository {
  constructor(
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(DocumentType) private readonly documentTypes: Repository<DocumentType>,
    @InjectRepository(Gender) private readonly genders: Repository<Gender>,
    @InjectRepository(BloodType) private readonly bloodTypes: Repository<BloodType>,
    @InjectRepository(ChronicCondition) private readonly conditions: Repository<ChronicCondition>,
    @InjectRepository(Severity) private readonly severities: Repository<Severity>,
  ) {}
  findAll(): Promise<Patient[]> {
    return this.patients.find({ where: { deletedAt: IsNull() }, order: { isPriority: 'DESC', lastName: 'ASC', firstName: 'ASC' } });
  }
  findById(id: number): Promise<Patient | null> {
    return this.patients.findOne({ where: { id, deletedAt: IsNull() } });
  }
  findByDocument(documentNumber: string): Promise<Patient | null> {
    return this.patients.findOne({ where: { documentNumber } });
  }
  findDocumentType(code: string): Promise<DocumentType | null> {
    return this.documentTypes.findOne({ where: { code, isActive: true } });
  }
  findGender(code: string): Promise<Gender | null> {
    return this.genders.findOne({ where: { code, isActive: true } });
  }
  findBloodType(code: string): Promise<BloodType | null> {
    return this.bloodTypes.findOne({ where: { code, isActive: true } });
  }
  findConditions(patientId: number): Promise<ChronicCondition[]> {
    return this.conditions.find({ where: { patientId }, order: { diagnosedAt: 'DESC', createdAt: 'DESC' } });
  }
  countConditions(patientId: number): Promise<number> {
    return this.conditions.count({ where: { patientId } });
  }
  findSeverity(code: string): Promise<Severity | null> {
    return this.severities.findOne({ where: { code, isActive: true } });
  }
  saveCondition(condition: ChronicCondition): Promise<ChronicCondition> { return this.conditions.save(condition); }
  save(patient: Patient): Promise<Patient> { return this.patients.save(patient); }
}

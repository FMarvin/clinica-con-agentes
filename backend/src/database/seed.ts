import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from './data-source';
import { Role } from '../users/entities/role.entity';
import { User } from '../users/entities/user.entity';

const catalogData: Array<{ table: string; rows: Array<[string, string]> }> = [
  { table: 'enum_document_types', rows: [['national_id', 'Documento nacional'], ['passport', 'Pasaporte']] },
  { table: 'enum_genders', rows: [['female', 'Femenino'], ['male', 'Masculino'], ['other', 'Otro']] },
  { table: 'enum_blood_types', rows: [['A+', 'A+'], ['A-', 'A-'], ['B+', 'B+'], ['B-', 'B-'], ['AB+', 'AB+'], ['AB-', 'AB-'], ['O+', 'O+'], ['O-', 'O-']] },
  { table: 'enum_severities', rows: [['low', 'Baja'], ['medium', 'Media'], ['high', 'Alta']] },
  { table: 'enum_prescription_statuses', rows: [['issued', 'Emitida'], ['dispensed', 'Despachada'], ['cancelled', 'Cancelada']] },
  { table: 'enum_appointment_statuses', rows: [['scheduled', 'Agendada'], ['completed', 'Completada'], ['cancelled', 'Cancelada']] },
  { table: 'enum_alert_types', rows: [['chronic_patient', 'Seguimiento de paciente crónico']] },
  { table: 'enum_alert_severities', rows: [['low', 'Baja'], ['medium', 'Media'], ['high', 'Alta']] },
  { table: 'enum_product_types', rows: [['medicine', 'Medicamento'], ['sample', 'Muestra médica'], ['supply', 'Insumo']] },
  { table: 'enum_movement_types', rows: [['in', 'Entrada'], ['out', 'Salida']] },
];

async function seed(): Promise<void> {
  await dataSource.initialize();
  try {
    for (const catalog of catalogData) {
      for (const [code, name] of catalog.rows) {
        await dataSource.query(
          `INSERT INTO ${catalog.table} (code, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = TRUE`,
          [code, name],
        );
      }
    }

    const roles = dataSource.getRepository(Role);
    const roleDefinitions = [
      ['admin', 'Administrador', 1],
      ['doctor', 'Doctor', 2],
      ['receptionist', 'Recepción', 3],
      ['pharmacist', 'Farmacia', 4],
    ] as const;
    for (const [code, name, sortOrder] of roleDefinitions) {
      const existing = await roles.findOne({ where: { code } });
      if (!existing) await roles.save(roles.create({ code, name, sortOrder, isActive: true }));
    }

    await seedAccount('SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD', 'admin', 'Administrador');
    await seedAccount('SEED_DOCTOR_EMAIL', 'SEED_DOCTOR_PASSWORD', 'doctor', 'Doctor');
  } finally {
    await dataSource.destroy();
  }
}

async function seedAccount(emailKey: string, passwordKey: string, roleCode: string, fullName: string): Promise<void> {
  const email = process.env[emailKey]?.trim().toLowerCase();
  const password = process.env[passwordKey];
  if (!email && !password) return;
  if (!email || !password || password.length < 12) {
    throw new Error(`${emailKey} y ${passwordKey} son obligatorios; la contraseña debe tener al menos 12 caracteres`);
  }
  const users = dataSource.getRepository(User);
  if (await users.findOne({ where: { email } })) return;
  const role = await dataSource.getRepository(Role).findOne({ where: { code: roleCode } });
  if (!role) throw new Error(`No existe el rol ${roleCode} para crear la cuenta`);
  await users.save(users.create({
    email,
    passwordHash: await bcrypt.hash(password, 12),
    fullName,
    roleId: role.id,
    role,
    isActive: true,
    passwordChangedAt: new Date(),
  }));
}

void seed().catch((error: unknown) => {
  console.error('Falló la inicialización de datos de catálogo:', error);
  process.exitCode = 1;
});

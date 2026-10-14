import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClinicalModules1730000001000 implements MigrationInterface {
  name = 'ClinicalModules1730000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const catalogs: Array<[string, number]> = [
      ['enum_document_types', 30],
      ['enum_genders', 20],
      ['enum_blood_types', 5],
      ['enum_severities', 20],
      ['enum_prescription_statuses', 20],
      ['enum_appointment_statuses', 20],
      ['enum_alert_types', 30],
      ['enum_alert_severities', 20],
      ['enum_product_types', 20],
      ['enum_movement_types', 20],
    ];
    for (const [table, codeLength] of catalogs) {
      await queryRunner.query(
        `CREATE TABLE ${table} (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(${codeLength}) NOT NULL UNIQUE, name VARCHAR(80) NOT NULL, description VARCHAR(255) NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INT NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
      );
    }

    await queryRunner.query(`CREATE TABLE patients (
      id INT AUTO_INCREMENT PRIMARY KEY, document_type_id INT NOT NULL, document_number VARCHAR(30) NOT NULL UNIQUE,
      first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, birth_date DATE NOT NULL, gender_id INT NULL,
      phone VARCHAR(30) NULL, email VARCHAR(150) NULL, address VARCHAR(255) NULL, blood_type_id INT NULL,
      allergies TEXT NULL, is_chronic BOOLEAN NOT NULL DEFAULT FALSE, is_priority BOOLEAN NOT NULL DEFAULT FALSE,
      is_deceased BOOLEAN NOT NULL DEFAULT FALSE, deceased_at DATETIME NULL, notes TEXT NULL,
      created_by INT NULL, updated_by INT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, deleted_at TIMESTAMP NULL,
      INDEX idx_patients_chronic_deceased (is_chronic, is_deceased), INDEX idx_patients_priority (is_priority),
      CONSTRAINT fk_patients_document_type FOREIGN KEY (document_type_id) REFERENCES enum_document_types(id),
      CONSTRAINT fk_patients_gender FOREIGN KEY (gender_id) REFERENCES enum_genders(id),
      CONSTRAINT fk_patients_blood_type FOREIGN KEY (blood_type_id) REFERENCES enum_blood_types(id),
      CONSTRAINT fk_patients_created_by FOREIGN KEY (created_by) REFERENCES users(id),
      CONSTRAINT fk_patients_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE chronic_conditions (
      id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT NOT NULL, name VARCHAR(150) NOT NULL, diagnosed_at DATE NULL,
      severity_id INT NULL, notes TEXT NULL, created_by INT NULL, updated_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_chronic_conditions_patient (patient_id),
      CONSTRAINT fk_chronic_conditions_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
      CONSTRAINT fk_chronic_conditions_severity FOREIGN KEY (severity_id) REFERENCES enum_severities(id),
      CONSTRAINT fk_chronic_conditions_created_by FOREIGN KEY (created_by) REFERENCES users(id),
      CONSTRAINT fk_chronic_conditions_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE appointments (
      id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT NOT NULL, doctor_id INT NOT NULL, scheduled_at DATETIME NOT NULL,
      duration_minutes INT NOT NULL DEFAULT 30, status_id INT NOT NULL, reason VARCHAR(255) NULL, notes TEXT NULL,
      created_by INT NULL, updated_by INT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_appointments_patient_date (patient_id, scheduled_at), INDEX idx_appointments_doctor_date (doctor_id, scheduled_at),
      CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
      CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES users(id),
      CONSTRAINT fk_appointments_status FOREIGN KEY (status_id) REFERENCES enum_appointment_statuses(id),
      CONSTRAINT fk_appointments_created_by FOREIGN KEY (created_by) REFERENCES users(id),
      CONSTRAINT fk_appointments_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE medical_records (
      id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT NOT NULL, doctor_id INT NOT NULL, appointment_id INT NULL,
      consultation_date DATETIME NOT NULL, reason VARCHAR(255) NOT NULL, diagnosis TEXT NULL, treatment TEXT NULL, notes TEXT NULL,
      created_by INT NULL, updated_by INT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_medical_records_patient_date (patient_id, consultation_date), INDEX idx_medical_records_doctor (doctor_id),
      CONSTRAINT fk_medical_records_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
      CONSTRAINT fk_medical_records_doctor FOREIGN KEY (doctor_id) REFERENCES users(id),
      CONSTRAINT fk_medical_records_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      CONSTRAINT fk_medical_records_created_by FOREIGN KEY (created_by) REFERENCES users(id),
      CONSTRAINT fk_medical_records_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE products (
      id INT AUTO_INCREMENT PRIMARY KEY, sku VARCHAR(50) NOT NULL UNIQUE, name VARCHAR(200) NOT NULL, description TEXT NULL,
      type_id INT NOT NULL, category VARCHAR(100) NULL, laboratory VARCHAR(150) NULL, unit VARCHAR(30) NULL,
      stock INT NOT NULL DEFAULT 0, min_stock INT NOT NULL DEFAULT 0, requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
      expiration_date DATE NULL, price DECIMAL(10,2) NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by INT NULL,
      updated_by INT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_products_type (type_id), INDEX idx_products_category (category), INDEX idx_products_active (is_active),
      CONSTRAINT fk_products_type FOREIGN KEY (type_id) REFERENCES enum_product_types(id),
      CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users(id),
      CONSTRAINT fk_products_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE prescriptions (
      id INT AUTO_INCREMENT PRIMARY KEY, medical_record_id INT NOT NULL, patient_id INT NOT NULL, doctor_id INT NOT NULL,
      code VARCHAR(50) NULL UNIQUE, issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, status_id INT NOT NULL,
      notes TEXT NULL, created_by INT NULL, updated_by INT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_prescriptions_patient (patient_id), INDEX idx_prescriptions_doctor (doctor_id),
      CONSTRAINT fk_prescriptions_record FOREIGN KEY (medical_record_id) REFERENCES medical_records(id),
      CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
      CONSTRAINT fk_prescriptions_doctor FOREIGN KEY (doctor_id) REFERENCES users(id),
      CONSTRAINT fk_prescriptions_status FOREIGN KEY (status_id) REFERENCES enum_prescription_statuses(id),
      CONSTRAINT fk_prescriptions_created_by FOREIGN KEY (created_by) REFERENCES users(id),
      CONSTRAINT fk_prescriptions_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE prescription_items (
      id INT AUTO_INCREMENT PRIMARY KEY, prescription_id INT NOT NULL, product_id INT NOT NULL, dosage VARCHAR(100) NOT NULL,
      frequency VARCHAR(100) NOT NULL, duration VARCHAR(50) NULL, quantity INT NOT NULL DEFAULT 1, instructions TEXT NULL,
      created_by INT NULL, updated_by INT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_prescription_items_prescription (prescription_id),
      CONSTRAINT fk_prescription_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
      CONSTRAINT fk_prescription_items_product FOREIGN KEY (product_id) REFERENCES products(id),
      CONSTRAINT fk_prescription_items_created_by FOREIGN KEY (created_by) REFERENCES users(id),
      CONSTRAINT fk_prescription_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE alerts (
      id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT NOT NULL, type_id INT NOT NULL, severity_id INT NOT NULL,
      title VARCHAR(150) NOT NULL, message TEXT NOT NULL, is_read BOOLEAN NOT NULL DEFAULT FALSE, triggered_by INT NULL,
      read_at DATETIME NULL, created_by INT NULL, updated_by INT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_alerts_patient_read (patient_id, is_read), INDEX idx_alerts_severity (severity_id),
      CONSTRAINT fk_alerts_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
      CONSTRAINT fk_alerts_type FOREIGN KEY (type_id) REFERENCES enum_alert_types(id),
      CONSTRAINT fk_alerts_severity FOREIGN KEY (severity_id) REFERENCES enum_alert_severities(id),
      CONSTRAINT fk_alerts_triggered_by FOREIGN KEY (triggered_by) REFERENCES users(id),
      CONSTRAINT fk_alerts_created_by FOREIGN KEY (created_by) REFERENCES users(id),
      CONSTRAINT fk_alerts_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE product_movements (
      id INT AUTO_INCREMENT PRIMARY KEY, product_id INT NOT NULL, type_id INT NOT NULL, quantity INT NOT NULL,
      reason VARCHAR(255) NULL, reference_id INT NULL, performed_by INT NULL, created_by INT NULL, updated_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_product_movements_product_date (product_id, created_at),
      CONSTRAINT fk_product_movements_product FOREIGN KEY (product_id) REFERENCES products(id),
      CONSTRAINT fk_product_movements_type FOREIGN KEY (type_id) REFERENCES enum_movement_types(id),
      CONSTRAINT fk_product_movements_performed_by FOREIGN KEY (performed_by) REFERENCES users(id),
      CONSTRAINT fk_product_movements_created_by FOREIGN KEY (created_by) REFERENCES users(id),
      CONSTRAINT fk_product_movements_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)) ENGINE=InnoDB`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'product_movements', 'alerts', 'prescription_items', 'prescriptions', 'products',
      'medical_records', 'appointments', 'chronic_conditions', 'patients',
      'enum_movement_types', 'enum_product_types', 'enum_alert_severities', 'enum_alert_types',
      'enum_appointment_statuses', 'enum_prescription_statuses', 'enum_severities',
      'enum_blood_types', 'enum_genders', 'enum_document_types',
    ]) {
      await queryRunner.query(`DROP TABLE ${table}`);
    }
  }
}

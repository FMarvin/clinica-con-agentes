import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialAuth1730000000000 implements MigrationInterface {
  name = 'InitialAuth1730000000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE enum_roles (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(30) NOT NULL UNIQUE, name VARCHAR(80) NOT NULL, description VARCHAR(255) NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INT NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(150) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, full_name VARCHAR(150) NOT NULL, role_id INT NOT NULL, phone VARCHAR(30) NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, last_login_at DATETIME NULL, password_changed_at DATETIME NULL, deleted_at TIMESTAMP NULL, created_by INT NULL, updated_by INT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES enum_roles(id), CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id), CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE audit_logs (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NULL, action VARCHAR(20) NOT NULL, entity VARCHAR(80) NOT NULL, entity_id VARCHAR(50) NOT NULL, old_values JSON NULL, new_values JSON NULL, ip_address VARCHAR(45) NULL, user_agent VARCHAR(255) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_audit_entity (entity, entity_id), INDEX idx_audit_user (user_id), INDEX idx_audit_created (created_at), INDEX idx_audit_action (action), CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id)) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE audit_logs');
    await queryRunner.query('DROP TABLE users');
    await queryRunner.query('DROP TABLE enum_roles');
  }
}

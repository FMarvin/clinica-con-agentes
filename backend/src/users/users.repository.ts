import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
  ) {}
  findByEmail(email: string): Promise<User | null> {
    return this.users.createQueryBuilder('user').addSelect('user.passwordHash').leftJoinAndSelect('user.role', 'role')
      .where('user.email = :email AND user.deleted_at IS NULL', { email }).getOne();
  }
  findActiveById(id: number): Promise<User | null> {
    return this.users.findOne({ where: { id, isActive: true, deletedAt: IsNull() } });
  }
  findActiveByIdWithPassword(id: number): Promise<User | null> {
    return this.users.createQueryBuilder('user').addSelect('user.passwordHash')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.id = :id AND user.is_active = TRUE AND user.deleted_at IS NULL', { id })
      .getOne();
  }
  findAll(): Promise<User[]> { return this.users.find({ where: { deletedAt: IsNull() }, order: { fullName: 'ASC' } }); }
  findRoles(): Promise<Role[]> { return this.roles.find({ where: { isActive: true }, order: { sortOrder: 'ASC', name: 'ASC' } }); }
  save(user: User): Promise<User> { return this.users.save(user); }
  roleByCode(code: string): Promise<Role | null> { return this.roles.findOne({ where: { code, isActive: true } }); }
}

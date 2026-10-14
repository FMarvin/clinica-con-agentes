import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from './entities/user.entity';

export type PublicUser = { id: number; email: string; fullName: string; role: { code: string; name: string } };

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}
  findByEmail(email: string): Promise<User | null> { return this.repository.findByEmail(email.toLowerCase()); }
  findActiveById(id: number): Promise<User | null> { return this.repository.findActiveById(id); }
  findActiveByIdWithPassword(id: number): Promise<User | null> { return this.repository.findActiveByIdWithPassword(id); }
  async list(): Promise<PublicUser[]> { return (await this.repository.findAll()).map((u) => this.toPublic(u)); }
  async listRoles(): Promise<Array<{ code: string; name: string }>> {
    return (await this.repository.findRoles()).map((role) => ({ code: role.code, name: role.name }));
  }
  toPublic(user: User): PublicUser {
    return { id: user.id, email: user.email, fullName: user.fullName, role: { code: user.role.code, name: user.role.name } };
  }
  async getPublic(id: number): Promise<PublicUser> {
    const user = await this.findActiveById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.toPublic(user);
  }
  save(user: User): Promise<User> { return this.repository.save(user); }
}

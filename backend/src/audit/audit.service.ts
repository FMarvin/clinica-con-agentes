import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export type AuditLogPage = {
  items: Array<Pick<AuditLog, 'id' | 'userId' | 'action' | 'entity' | 'entityId' | 'oldValues' | 'newValues' | 'createdAt'> & { userName: string | null }>;
  page: number;
  limit: number;
  total: number;
};

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly repository: Repository<AuditLog>) {}
  record(
    action: string,
    entity: string,
    userId: number | null,
    entityId: number | string,
    newValues?: Record<string, unknown>,
    oldValues?: Record<string, unknown>,
  ): Promise<AuditLog> {
    return this.repository.save(this.repository.create({
      action,
      entity,
      userId,
      entityId: String(entityId),
      oldValues: oldValues ?? null,
      newValues: newValues ?? null,
      ipAddress: null,
      userAgent: null,
    }));
  }

  async list(page = 1, limit = 25, entity?: string): Promise<AuditLogPage> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const query = this.repository.createQueryBuilder('log')
      .leftJoin('users', 'actor', 'actor.id = log.userId')
      .select([
        'log.id AS id',
        'log.userId AS userId',
        'actor.full_name AS userName',
        'log.action AS action',
        'log.entity AS entity',
        'log.entityId AS entityId',
        'log.oldValues AS oldValues',
        'log.newValues AS newValues',
        'log.createdAt AS createdAt',
      ]);
    if (entity) query.andWhere('log.entity = :entity', { entity });
    const [items, total] = await Promise.all([
      query.clone().orderBy('log.createdAt', 'DESC').addOrderBy('log.id', 'DESC')
        .offset((safePage - 1) * safeLimit).limit(safeLimit).getRawMany(),
      query.clone().getCount(),
    ]);
    return { items, page: safePage, limit: safeLimit, total };
  }
}

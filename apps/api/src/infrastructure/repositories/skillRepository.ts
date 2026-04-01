import { Knex } from 'knex';
import db from '../database';

export interface Skill {
  id: string;
  name: string;
  description: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface SkillVersionCheck {
  id: string;
  version: number;
}

export interface SkillWithUsers extends Skill {
  user_skills: {
    id: string;
    user: { id: string; name: string; email: string };
  }[];
}

function getDb(trx?: Knex.Transaction): Knex {
  return trx || db;
}

export const skillRepository = {
  findMany(trx?: Knex.Transaction): Promise<Skill[]> {
    const queryDb = getDb(trx);
    return queryDb('skills').select('*').orderBy('name', 'asc');
  },

  findById(id: string, trx?: Knex.Transaction): Promise<SkillWithUsers | null> {
    const queryDb = getDb(trx);
    return queryDb('skills')
      .where({ id })
      .first()
      .then(async (skill) => {
        if (!skill) return null;

        const userSkills = await queryDb('user_skills')
          .where('user_skills.skill_id', id)
          .leftJoin('users', 'user_skills.user_id', 'users.id')
          .select(
            'user_skills.id',
            db.raw(
              "JSON_BUILD_OBJECT('id', users.id, 'name', users.name, 'email', users.email) as user",
            ),
          );

        return {
          ...skill,
          user_skills: userSkills.map((u: Record<string, unknown>) => ({
            id: u.id,
            user: u.user as SkillWithUsers['user_skills'][number]['user'],
          })),
        };
      });
  },

  findVersion(id: string, trx?: Knex.Transaction): Promise<SkillVersionCheck | null> {
    const queryDb = getDb(trx);
    return queryDb('skills')
      .where({ id })
      .select('id', 'version')
      .first()
      .then((row) => row || null);
  },

  async create(
    data: { name: string; description?: string },
    trx?: Knex.Transaction,
  ): Promise<Skill> {
    const queryDb = getDb(trx);
    const rows = await queryDb('skills')
      .insert({
        ...data,
        version: 1,
      })
      .returning('*');
    return rows[0];
  },

  async createWithValidation(
    data: { name: string; description?: string },
    trx: Knex.Transaction,
  ): Promise<{ success: boolean; error?: string; skill?: Skill }> {
    const existing = await trx('skills')
      .whereRaw('LOWER(name) = LOWER(?)', [data.name])
      .first();

    if (existing) {
      return { success: false, error: 'Skill with this name already exists' };
    }

    const rows = await trx('skills')
      .insert({
        ...data,
        version: 1,
      })
      .returning('*');

    return { success: true, skill: rows[0] };
  },

  async update(
    id: string,
    data: Partial<Pick<Skill, 'name' | 'description'>>,
    trx?: Knex.Transaction,
  ): Promise<Skill> {
    const queryDb = getDb(trx);
    const rows = await queryDb('skills')
      .where({ id })
      .update({ ...data, updated_at: queryDb.fn.now() })
      .returning('*');
    return rows[0];
  },

  async updateWithVersion(
    id: string,
    data: Partial<Pick<Skill, 'name' | 'description'>>,
    expectedVersion: number,
    trx: Knex.Transaction,
  ): Promise<{ success: boolean; error?: string; skill?: Skill }> {
    const current = await trx('skills')
      .where({ id })
      .select('id', 'version')
      .first();

    if (!current) {
      return { success: false, error: 'Skill not found' };
    }

    if (current.version !== expectedVersion) {
      return { success: false, error: 'CONFLICT: Skill was modified by another user' };
    }

    if (data.name) {
      const existing = await trx('skills')
        .whereRaw('LOWER(name) = LOWER(?)', [data.name])
        .whereNot('id', id)
        .first();
      if (existing) {
        return { success: false, error: 'Skill with this name already exists' };
      }
    }

    const rows = await trx('skills')
      .where({ id })
      .update({
        ...data,
        version: current.version + 1,
        updated_at: trx.fn.now(),
      })
      .returning('*');

    return { success: true, skill: rows[0] };
  },

  delete(id: string, trx?: Knex.Transaction): Promise<number> {
    const queryDb = getDb(trx);
    return queryDb('skills').where({ id }).del();
  },

  async deleteWithValidation(
    id: string,
    trx: Knex.Transaction,
  ): Promise<{ success: boolean; error?: string }> {
    const skill = await trx('skills').where({ id }).first();
    if (!skill) {
      return { success: false, error: 'Skill not found' };
    }

    const assignedUsers = await trx('user_skills')
      .where('skill_id', id)
      .count('*')
      .first();

    if (assignedUsers && Number(assignedUsers.count) > 0) {
      return { success: false, error: 'Cannot delete skill assigned to users' };
    }

    const requiredShifts = await trx('shifts')
      .where('required_skill_id', id)
      .count('*')
      .first();

    if (requiredShifts && Number(requiredShifts.count) > 0) {
      return { success: false, error: 'Cannot delete skill required by shifts' };
    }

    await trx('skills').where({ id }).del();
    return { success: true };
  },

  count(where?: Record<string, unknown>, trx?: Knex.Transaction): Promise<number> {
    const queryDb = getDb(trx);
    const query = where ? queryDb('skills').where(where) : queryDb('skills');
    return query.count('*').then((r) => Number(r[0].count));
  },

  getKnex(): Knex {
    return db;
  },

  getDb(trx?: Knex.Transaction): Knex {
    return getDb(trx);
  },
};
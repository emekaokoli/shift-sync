import { Knex } from 'knex';
import db from '../database';

export interface Skill {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SkillWithUsers extends Skill {
  user_skills: {
    id: string;
    user: { id: string; name: string; email: string };
  }[];
}

export const skillRepository = {
  findMany(): Promise<Skill[]> {
    return db('skills').select('*').orderBy('name', 'asc');
  },

  findById(id: string): Promise<SkillWithUsers | null> {
    return db('skills')
      .where({ id })
      .first()
      .then(async (skill) => {
        if (!skill) return null;

        const userSkills = await db('user_skills')
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

  create(data: { name: string; description?: string }): Promise<Skill> {
    return db('skills')
      .insert(data)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(
    id: string,
    data: Partial<Pick<Skill, 'name' | 'description'>>,
  ): Promise<Skill> {
    return db('skills')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: string): Promise<number> {
    return db('skills').where({ id }).del();
  },

  count(where?: Record<string, unknown>): Promise<number> {
    const query = where ? db('skills').where(where) : db('skills');
    return query.count('*').then((r) => Number(r[0].count));
  },

  getKnex(): Knex {
    return db;
  },
};

import { Knex } from 'knex';
import db from '../database';

export interface Location {
  id: string;
  name: string;
  address: string;
  timezone: string;
  cutoff_hours: number;
  created_at: Date;
  updated_at: Date;
}

export interface LocationWithShifts extends Location {
  shifts: {
    id: string;
    start_time: Date;
    end_time: Date;
    status: string;
    required_skill: { id: string; name: string };
    assignments: { id: string; staff: { id: string; name: string } }[];
  }[];
}

export const locationRepository = {
  findMany(): Promise<Location[]> {
    return db('locations').select();
  },

  findById(id: string): Promise<LocationWithShifts | null> {
    return db('locations')
      .where({ id })
      .first()
      .then(async (location) => {
        if (!location) return null;

        const shifts = await db('shifts')
          .where('shifts.location_id', id)
          .where('shifts.start_time', '>=', new Date())
          .leftJoin(
            'skills as required_skill',
            'shifts.required_skill_id',
            'required_skill.id',
          )
          .select(
            'shifts.id',
            'shifts.start_time',
            'shifts.end_time',
            'shifts.status',
            db.raw(
              "JSON_BUILD_OBJECT('id', required_skill.id, 'name', required_skill.name) as required_skill",
            ),
          )
          .orderBy('shifts.start_time', 'asc')
          .limit(20);

        return {
          ...location,
          shifts: shifts.map((s: Record<string, unknown>) => ({
            ...s,
            required_skill:
              s.required_skill as LocationWithShifts['shifts'][number]['required_skill'],
          })),
        };
      });
  },

  create(data: {
    name: string;
    address?: string;
    timezone: string;
    cutoff_hours?: number;
  }): Promise<Location> {
    return db('locations')
      .insert(data)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(
    id: string,
    data: Partial<
      Pick<Location, 'name' | 'address' | 'timezone' | 'cutoff_hours'>
    >,
  ): Promise<Location> {
    return db('locations')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: string): Promise<number> {
    return db('locations').where({ id }).del();
  },

  getKnex(): Knex {
    return db;
  },
};

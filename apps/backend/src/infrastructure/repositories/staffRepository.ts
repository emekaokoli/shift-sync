import { Knex } from 'knex';
import db from '../database';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  timezone: string;
  desired_hours: number;
  created_at: Date;
  updated_at: Date;
}

export interface Availability {
  id: string;
  user_id: string;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface StaffFilter {
  role?: string;
  locationId?: string;
  skillId?: string;
}

export const staffRepository = {
  findMany(filter?: StaffFilter): Promise<Omit<User, 'password_hash'>[]> {
    let query = db('users')
      .select(
        'id',
        'email',
        'name',
        'role',
        'timezone',
        'desired_hours',
        'created_at',
      )
      .orderBy('name', 'asc');

    if (filter?.role) {
      query = query.where('role', filter.role);
    }

    return query.then((rows) => rows);
  },

  findById(id: string): Promise<Omit<User, 'password_hash'> | null> {
    return db('users')
      .where({ id })
      .select(
        'id',
        'email',
        'name',
        'role',
        'timezone',
        'desired_hours',
        'created_at',
      )
      .first()
      .then((row) => row || null);
  },

  update(
    id: string,
    data: Partial<
      Pick<User, 'email' | 'name' | 'role' | 'timezone' | 'desired_hours'>
    >,
  ): Promise<Omit<User, 'password_hash'>> {
    return db('users')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning([
        'id',
        'email',
        'name',
        'role',
        'timezone',
        'desired_hours',
        'created_at',
      ])
      .then((rows) => rows[0]);
  },

  addSkill(
    userId: string,
    skillId: string,
  ): Promise<{
    user_id: string;
    skill_id: string;
    skill: { id: string; name: string };
  }> {
    return db('user_skills')
      .insert({ user_id: userId, skill_id: skillId })
      .onConflict(['user_id', 'skill_id'])
      .ignore()
      .then(() =>
        db('user_skills')
          .where({ user_id: userId, skill_id: skillId })
          .leftJoin('skills', 'user_skills.skill_id', 'skills.id')
          .select(
            'user_skills.user_id',
            'user_skills.skill_id',
            db.raw(
              "JSON_BUILD_OBJECT('id', skills.id, 'name', skills.name) as skill",
            ),
          )
          .first(),
      );
  },

  removeSkill(userId: string, skillId: string): Promise<number> {
    return db('user_skills')
      .where({ user_id: userId, skill_id: skillId })
      .del();
  },

  addLocation(
    userId: string,
    locationId: string,
    isManager?: boolean,
  ): Promise<{
    user_id: string;
    location_id: string;
    is_manager: boolean;
    location: { id: string; name: string };
  }> {
    return db('user_locations')
      .insert({
        user_id: userId,
        location_id: locationId,
        is_manager: isManager || false,
      })
      .onConflict(['user_id', 'location_id'])
      .merge({ is_manager: isManager })
      .then(() =>
        db('user_locations')
          .where({ user_id: userId, location_id: locationId })
          .leftJoin('locations', 'user_locations.location_id', 'locations.id')
          .select(
            'user_locations.user_id',
            'user_locations.location_id',
            'user_locations.is_manager',
            db.raw(
              "JSON_BUILD_OBJECT('id', locations.id, 'name', locations.name) as location",
            ),
          )
          .first(),
      );
  },

  removeLocation(userId: string, locationId: string): Promise<number> {
    return db('user_locations')
      .where({ user_id: userId, location_id: locationId })
      .del();
  },

  addAvailability(
    userId: string,
    data: {
      day_of_week?: number;
      start_time: string;
      end_time: string;
      is_recurring?: boolean;
      specific_date?: string | null;
    },
  ): Promise<Availability> {
    return db('availability')
      .insert({
        user_id: userId,
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
        is_recurring: data.is_recurring ?? true,
        specific_date: data.specific_date ? new Date(data.specific_date) : null,
      })
      .returning('*')
      .then((rows) => rows[0]);
  },

  deleteAvailability(id: string): Promise<number> {
    return db('availability').where({ id }).del();
  },

  getKnex(): Knex {
    return db;
  },
};

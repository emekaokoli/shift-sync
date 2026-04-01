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
  version: number;
  notification_preferences?: Record<string, boolean>;
  created_at: Date;
  updated_at: Date;
}

export interface UserVersionCheck {
  id: string;
  version: number;
  role: string;
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

function getDb(trx?: Knex.Transaction): Knex {
  return trx || db;
}

export const staffRepository = {
  findMany(filter?: StaffFilter, trx?: Knex.Transaction): Promise<Omit<User, 'password_hash'>[]> {
    const queryDb = getDb(trx);
    let query = queryDb('users')
      .select('id', 'email', 'name', 'role', 'timezone', 'desired_hours', 'notification_preferences', 'created_at')
      .orderBy('name', 'asc');

    if (filter?.role) {
      query = query.where('role', filter.role);
    }

    return query.then((rows) => rows);
  },

  findById(id: string, trx?: Knex.Transaction): Promise<Omit<User, 'password_hash'> | null> {
    const queryDb = getDb(trx);
    return queryDb('users')
      .where({ id })
      .select('id', 'email', 'name', 'role', 'timezone', 'desired_hours', 'notification_preferences', 'created_at')
      .first()
      .then((row) => row || null);
  },

  findVersion(id: string, trx?: Knex.Transaction): Promise<UserVersionCheck | null> {
    const queryDb = getDb(trx);
    return queryDb('users')
      .where({ id })
      .select('id', 'version', 'role')
      .first()
      .then((row) => row || null);
  },

  async update(
    id: string,
    data: Partial<Pick<User, 'email' | 'name' | 'role' | 'timezone' | 'desired_hours' | 'notification_preferences'>>,
    trx?: Knex.Transaction
  ): Promise<Omit<User, 'password_hash'>> {
    const queryDb = getDb(trx);
    const rows = await queryDb('users')
      .where({ id })
      .update({ ...data, updated_at: queryDb.fn.now() })
      .returning(['id', 'email', 'name', 'role', 'timezone', 'desired_hours', 'notification_preferences', 'created_at']);
    return rows[0];
  },

  async updateWithVersion(
    id: string,
    data: Partial<Pick<User, 'email' | 'name' | 'role' | 'timezone' | 'desired_hours'>>,
    expectedVersion: number,
    trx: Knex.Transaction
  ): Promise<{
    success: boolean;
    error?: string;
    user?: Omit<User, 'password_hash'>;
  }> {
    const current = await trx('users').where({ id }).select('id', 'version').first();

    if (!current) {
      return { success: false, error: 'User not found' };
    }

    if (current.version !== expectedVersion) {
      return {
        success: false,
        error: 'CONFLICT: User was modified by another user',
      };
    }

    const rows = await trx('users')
      .where({ id })
      .update({
        ...data,
        version: current.version + 1,
        updated_at: trx.fn.now(),
      })
      .returning(['id', 'email', 'name', 'role', 'timezone', 'desired_hours', 'created_at']);

    return { success: true, user: rows[0] };
  },

  async addSkill(
    userId: string,
    skillId: string,
    trx?: Knex.Transaction
  ): Promise<{
    user_id: string;
    skill_id: string;
    skill: { id: string; name: string };
  }> {
    const queryDb = getDb(trx);
    await queryDb('user_skills')
      .insert({ user_id: userId, skill_id: skillId })
      .onConflict(['user_id', 'skill_id'])
      .ignore();

    return queryDb('user_skills')
      .where({ user_id: userId, skill_id: skillId })
      .leftJoin('skills', 'user_skills.skill_id', 'skills.id')
      .select(
        'user_skills.user_id',
        'user_skills.skill_id',
        db.raw("JSON_BUILD_OBJECT('id', skills.id, 'name', skills.name) as skill")
      )
      .first()
      .then((row: Record<string, unknown>) => ({
        user_id: row.user_id as string,
        skill_id: row.skill_id as string,
        skill: row.skill as { id: string; name: string },
      }));
  },

  async addSkillWithValidation(
    userId: string,
    skillId: string,
    trx: Knex.Transaction
  ): Promise<{ success: boolean; error?: string }> {
    const [user, skill] = await Promise.all([
      trx('users').where({ id: userId }).first(),
      trx('skills').where({ id: skillId }).first(),
    ]);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!skill) {
      return { success: false, error: 'Skill not found' };
    }

    await trx('user_skills')
      .insert({ user_id: userId, skill_id: skillId })
      .onConflict(['user_id', 'skill_id'])
      .ignore();

    return { success: true };
  },

  removeSkill(userId: string, skillId: string, trx?: Knex.Transaction): Promise<number> {
    const queryDb = getDb(trx);
    return queryDb('user_skills').where({ user_id: userId, skill_id: skillId }).del();
  },

  async addLocation(
    userId: string,
    locationId: string,
    isManager?: boolean,
    trx?: Knex.Transaction
  ): Promise<{
    user_id: string;
    location_id: string;
    is_manager: boolean;
    location: { id: string; name: string };
  }> {
    const queryDb = getDb(trx);
    await queryDb('user_locations')
      .insert({
        user_id: userId,
        location_id: locationId,
        is_manager: isManager || false,
      })
      .onConflict(['user_id', 'location_id'])
      .merge({ is_manager: isManager });

    return queryDb('user_locations')
      .where({ user_id: userId, location_id: locationId })
      .leftJoin('locations', 'user_locations.location_id', 'locations.id')
      .select(
        'user_locations.user_id',
        'user_locations.location_id',
        'user_locations.is_manager',
        db.raw("JSON_BUILD_OBJECT('id', locations.id, 'name', locations.name) as location")
      )
      .first()
      .then((row: Record<string, unknown>) => ({
        user_id: row.user_id as string,
        location_id: row.location_id as string,
        is_manager: row.is_manager as boolean,
        location: row.location as { id: string; name: string },
      }));
  },

  async addLocationWithValidation(
    userId: string,
    locationId: string,
    isManager: boolean,
    trx: Knex.Transaction
  ): Promise<{ success: boolean; error?: string }> {
    const [user, location] = await Promise.all([
      trx('users').where({ id: userId }).first(),
      trx('locations').where({ id: locationId }).first(),
    ]);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!location) {
      return { success: false, error: 'Location not found' };
    }

    if (isManager && user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return {
        success: false,
        error: 'Only managers can be assigned to locations as managers',
      };
    }

    await trx('user_locations')
      .insert({
        user_id: userId,
        location_id: locationId,
        is_manager: isManager,
      })
      .onConflict(['user_id', 'location_id'])
      .merge({ is_manager: isManager });

    return { success: true };
  },

  removeLocation(userId: string, locationId: string, trx?: Knex.Transaction): Promise<number> {
    const queryDb = getDb(trx);
    return queryDb('user_locations').where({ user_id: userId, location_id: locationId }).del();
  },

  async findUserLocationIds(
    userId: string,
    onlyManaged = false,
    trx?: Knex.Transaction
  ): Promise<string[]> {
    const queryDb = getDb(trx);
    const rows = await queryDb('user_locations')
      .where({ user_id: userId })
      .modify((queryBuilder) => {
        if (onlyManaged) {
          queryBuilder.where('is_manager', true);
        }
      })
      .select('location_id');

    return (rows as { location_id: string }[]).map((row) => row.location_id);
  },

  async addAvailability(
    userId: string,
    data: {
      day_of_week?: number;
      start_time: string;
      end_time: string;
      is_recurring?: boolean;
      specific_date?: string | null;
    },
    trx?: Knex.Transaction
  ): Promise<Availability> {
    const queryDb = getDb(trx);
    const rows = await queryDb('availability')
      .insert({
        user_id: userId,
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
        is_recurring: data.is_recurring ?? true,
        specific_date: data.specific_date ? new Date(data.specific_date) : null,
      })
      .returning('*');
    return rows[0];
  },

  async addAvailabilityWithValidation(
    userId: string,
    data: {
      day_of_week?: number;
      start_time: string;
      end_time: string;
      is_recurring?: boolean;
      specific_date?: string | null;
    },
    trx: Knex.Transaction
  ): Promise<{
    success: boolean;
    error?: string;
    availability?: Availability;
  }> {
    const user = await trx('users').where({ id: userId }).first();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (data.start_time >= data.end_time) {
      return { success: false, error: 'Start time must be before end time' };
    }

    if (data.day_of_week !== undefined && (data.day_of_week < 0 || data.day_of_week > 6)) {
      return { success: false, error: 'Day of week must be between 0 and 6' };
    }

    const rows = await trx('availability')
      .insert({
        user_id: userId,
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
        is_recurring: data.is_recurring ?? true,
        specific_date: data.specific_date ? new Date(data.specific_date) : null,
      })
      .returning('*');

    return { success: true, availability: rows[0] };
  },

  deleteAvailability(id: string, trx?: Knex.Transaction): Promise<number> {
    const queryDb = getDb(trx);
    return queryDb('availability').where({ id }).del();
  },

  getKnex(): Knex {
    return db;
  },

  getDb(trx?: Knex.Transaction): Knex {
    return getDb(trx);
  },
};

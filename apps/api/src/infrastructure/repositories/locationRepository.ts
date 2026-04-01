import { Knex } from 'knex';
import db from '../database';

export interface Location {
  id: string;
  name: string;
  address: string;
  timezone: string;
  cutoff_hours: number;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface LocationVersionCheck {
  id: string;
  version: number;
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

function getDb(trx?: Knex.Transaction): Knex {
  return trx || db;
}

export const locationRepository = {
  findMany(trx?: Knex.Transaction): Promise<Location[]> {
    const queryDb = getDb(trx);
    return queryDb('locations').select();
  },

  findById(id: string, trx?: Knex.Transaction): Promise<LocationWithShifts | null> {
    const queryDb = getDb(trx);
    return queryDb('locations')
      .where({ id })
      .first()
      .then(async (location) => {
        if (!location) return null;

        const shifts = await queryDb('shifts')
          .where('shifts.location_id', id)
          .where('shifts.start_time', '>=', new Date())
          .leftJoin('skills as required_skill', 'shifts.required_skill_id', 'required_skill.id')
          .select(
            'shifts.id',
            'shifts.start_time',
            'shifts.end_time',
            'shifts.status',
            db.raw(
              "JSON_BUILD_OBJECT('id', required_skill.id, 'name', required_skill.name) as required_skill"
            )
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

  findVersion(id: string, trx?: Knex.Transaction): Promise<LocationVersionCheck | null> {
    const queryDb = getDb(trx);
    return queryDb('locations')
      .where({ id })
      .select('id', 'version')
      .first()
      .then((row) => row || null);
  },

  async create(
    data: {
      name: string;
      address?: string;
      timezone: string;
      cutoff_hours?: number;
    },
    trx?: Knex.Transaction
  ): Promise<Location> {
    const queryDb = getDb(trx);
    const rows = await queryDb('locations')
      .insert({
        ...data,
        cutoff_hours: data.cutoff_hours ?? 24,
        version: 1,
      })
      .returning('*');
    return rows[0];
  },

  async createWithValidation(
    data: {
      name: string;
      address?: string;
      timezone: string;
      cutoff_hours?: number;
    },
    trx: Knex.Transaction
  ): Promise<{ success: boolean; error?: string; location?: Location }> {
    const existing = await trx('locations').where('name', data.name).first();

    if (existing) {
      return {
        success: false,
        error: 'Location with this name already exists',
      };
    }

    try {
      Intl.DateTimeFormat(undefined, { timeZone: data.timezone });
    } catch {
      return { success: false, error: 'Invalid timezone' };
    }

    if (data.cutoff_hours !== undefined && (data.cutoff_hours < 1 || data.cutoff_hours > 168)) {
      return {
        success: false,
        error: 'Cutoff hours must be between 1 and 168',
      };
    }

    const rows = await trx('locations')
      .insert({
        ...data,
        cutoff_hours: data.cutoff_hours ?? 24,
        version: 1,
      })
      .returning('*');

    return { success: true, location: rows[0] };
  },

  async update(
    id: string,
    data: Partial<Pick<Location, 'name' | 'address' | 'timezone' | 'cutoff_hours'>>,
    trx?: Knex.Transaction
  ): Promise<Location> {
    const queryDb = getDb(trx);
    const rows = await queryDb('locations')
      .where({ id })
      .update({ ...data, updated_at: queryDb.fn.now() })
      .returning('*');
    return rows[0];
  },

  async updateWithVersion(
    id: string,
    data: Partial<Pick<Location, 'name' | 'address' | 'timezone' | 'cutoff_hours'>>,
    expectedVersion: number,
    trx: Knex.Transaction
  ): Promise<{ success: boolean; error?: string; location?: Location }> {
    const current = await trx('locations').where({ id }).select('id', 'version').first();

    if (!current) {
      return { success: false, error: 'Location not found' };
    }

    if (current.version !== expectedVersion) {
      return {
        success: false,
        error: 'CONFLICT: Location was modified by another user',
      };
    }

    if (data.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: data.timezone });
      } catch {
        return { success: false, error: 'Invalid timezone' };
      }
    }

    if (data.name) {
      const existing = await trx('locations').where('name', data.name).whereNot('id', id).first();
      if (existing) {
        return {
          success: false,
          error: 'Location with this name already exists',
        };
      }
    }

    const rows = await trx('locations')
      .where({ id })
      .update({
        ...data,
        version: current.version + 1,
        updated_at: trx.fn.now(),
      })
      .returning('*');

    return { success: true, location: rows[0] };
  },

  delete(id: string, trx?: Knex.Transaction): Promise<number> {
    const queryDb = getDb(trx);
    return queryDb('locations').where({ id }).del();
  },

  async deleteWithValidation(
    id: string,
    trx: Knex.Transaction
  ): Promise<{ success: boolean; error?: string }> {
    const location = await trx('locations').where({ id }).first();
    if (!location) {
      return { success: false, error: 'Location not found' };
    }

    const activeShifts = await trx('shifts')
      .where('location_id', id)
      .whereIn('status', ['PUBLISHED', 'DRAFT'])
      .count('*')
      .first();

    if (activeShifts && Number(activeShifts.count) > 0) {
      return {
        success: false,
        error: 'Cannot delete location with active shifts',
      };
    }

    const assignedUsers = await trx('user_locations').where('location_id', id).count('*').first();

    if (assignedUsers && Number(assignedUsers.count) > 0) {
      return {
        success: false,
        error: 'Cannot delete location with assigned users',
      };
    }

    await trx('locations').where({ id }).del();
    return { success: true };
  },

  getKnex(): Knex {
    return db;
  },

  getDb(trx?: Knex.Transaction): Knex {
    return getDb(trx);
  },
};

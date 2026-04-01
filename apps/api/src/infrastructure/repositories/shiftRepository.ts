import { Knex } from 'knex';
import db from '../database';

export interface Shift {
  id: string;
  location_id: string;
  start_time: Date;
  end_time: Date;
  required_skill_id: string;
  headcount: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  published_at: Date | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface ShiftWithRelations extends Shift {
  location: { id: string; name: string; timezone: string } | null;
  required_skill: { id: string; name: string } | null;
  assignments: {
    id: string;
    staff: { id: string; name: string; email: string };
  }[];
  swap_requests?: {
    id: string;
    requester: { id: string; name: string };
    target: { id: string; name: string } | null;
  }[];
  drop_requests?: { id: string; requester: { id: string; name: string } }[];
}

export interface ShiftFilter {
  locationId?: string;
  locationIds?: string[];
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

interface ShiftVersionCheck {
  id: string;
  version: number;
  status: string;
}

const shiftSelect = [
  'shifts.id',
  'shifts.location_id',
  'shifts.start_time',
  'shifts.end_time',
  'shifts.required_skill_id',
  'shifts.headcount',
  'shifts.status',
  'shifts.published_at',
  'shifts.version',
  'shifts.created_at',
  'shifts.updated_at',
];

function getDb(trx?: Knex.Transaction): Knex {
  return trx || db;
}

export const shiftRepository = {
  findMany(filter?: ShiftFilter, trx?: Knex.Transaction): Promise<ShiftWithRelations[]> {
    const queryDb = getDb(trx);
    let query = queryDb('shifts')
      .select(shiftSelect)
      .leftJoin('locations', 'shifts.location_id', 'locations.id')
      .leftJoin('skills as required_skill', 'shifts.required_skill_id', 'required_skill.id')
      .select(
        db.raw(
          "JSON_BUILD_OBJECT('id', locations.id, 'name', locations.name, 'timezone', locations.timezone) as location"
        ),
        db.raw(
          "JSON_BUILD_OBJECT('id', required_skill.id, 'name', required_skill.name) as required_skill"
        )
      )
      .orderBy('shifts.start_time', 'asc');

    if (filter?.locationIds) {
      if (filter.locationIds.length === 0) {
        query = query.whereRaw('1 = 0');
      } else {
        query = query.whereIn('shifts.location_id', filter.locationIds);
      }
    }
    if (filter?.locationId) {
      query = query.where('shifts.location_id', filter.locationId);
    }
    if (filter?.status) {
      query = query.where('shifts.status', filter.status);
    }
    if (filter?.startDate) {
      query = query.where('shifts.start_time', '>=', filter.startDate);
    }
    if (filter?.endDate) {
      query = query.where('shifts.start_time', '<=', filter.endDate);
    }

    return query.then((rows) =>
      rows.map((row: Record<string, unknown>) => ({
        ...row,
        location: row.location as ShiftWithRelations['location'],
        required_skill: row.required_skill as ShiftWithRelations['required_skill'],
        assignments: [],
      }))
    ) as Promise<ShiftWithRelations[]>;
  },

  findById(id: string, trx?: Knex.Transaction): Promise<ShiftWithRelations | null> {
    const queryDb = getDb(trx);
    return queryDb('shifts')
      .select(
        ...shiftSelect,
        db.raw(
          "JSON_BUILD_OBJECT('id', locations.id, 'name', locations.name, 'timezone', locations.timezone) as location"
        ),
        db.raw(
          "JSON_BUILD_OBJECT('id', required_skill.id, 'name', required_skill.name) as required_skill"
        ),
        db.raw(
          "COALESCE(JSON_AGG(assignments.staff) FILTER (WHERE assignments.staff IS NOT NULL), '[]') as assignments"
        )
      )
      .leftJoin('locations', 'shifts.location_id', 'locations.id')
      .leftJoin('skills as required_skill', 'shifts.required_skill_id', 'required_skill.id')
      .leftJoin(
        db('shift_assignments')
          .select(
            'shift_assignments.id',
            'shift_assignments.shift_id',
            db.raw(
              "JSON_BUILD_OBJECT('id', users.id, 'name', users.name, 'email', users.email) as staff"
            )
          )
          .leftJoin('users', 'shift_assignments.staff_id', 'users.id')
          .as('assignments'),
        'assignments.shift_id',
        'shifts.id'
      )
      .groupBy('shifts.id', 'locations.id', 'required_skill.id')
      .where('shifts.id', id)
      .first()
      .then((row: Record<string, unknown> | undefined) => {
        if (!row) return null;
        return {
          ...row,
          location: row.location as ShiftWithRelations['location'],
          required_skill: row.required_skill as ShiftWithRelations['required_skill'],
          assignments: (row.assignments as ShiftWithRelations['assignments']) || [],
        };
      }) as Promise<ShiftWithRelations | null>;
  },

  findVersion(id: string, trx?: Knex.Transaction): Promise<ShiftVersionCheck | null> {
    const queryDb = getDb(trx);
    return queryDb('shifts')
      .where({ id })
      .select('id', 'version', 'status')
      .first()
      .then((row) => row || null);
  },

  findByStaffId(userId: string, trx?: Knex.Transaction): Promise<ShiftWithRelations[]> {
    const queryDb = getDb(trx);
    return queryDb('shifts')
      .select(
        ...shiftSelect,
        db.raw(
          "JSON_BUILD_OBJECT('id', locations.id, 'name', locations.name, 'timezone', locations.timezone) as location"
        ),
        db.raw(
          "JSON_BUILD_OBJECT('id', required_skill.id, 'name', required_skill.name) as required_skill"
        ),
        db.raw(
          "COALESCE(JSON_AGG(assignments.staff) FILTER (WHERE assignments.staff IS NOT NULL), '[]') as assignments"
        )
      )
      .leftJoin('locations', 'shifts.location_id', 'locations.id')
      .leftJoin('skills as required_skill', 'shifts.required_skill_id', 'required_skill.id')
      .leftJoin(
        db('shift_assignments')
          .select(
            'shift_assignments.id',
            'shift_assignments.shift_id',
            db.raw(
              "JSON_BUILD_OBJECT('id', users.id, 'name', users.name, 'email', users.email) as staff"
            )
          )
          .leftJoin('users', 'shift_assignments.staff_id', 'users.id')
          .as('assignments'),
        'assignments.shift_id',
        'shifts.id'
      )
      .innerJoin('shift_assignments', 'shift_assignments.shift_id', 'shifts.id')
      .where('shift_assignments.staff_id', userId)
      .groupBy('shifts.id', 'locations.id', 'required_skill.id')
      .orderBy('shifts.start_time', 'asc');
  },

  async create(
    data: {
      location_id: string;
      required_skill_id: string;
      start_time: Date;
      end_time: Date;
      headcount: number;
      status: Shift['status'];
    },
    trx?: Knex.Transaction
  ): Promise<ShiftWithRelations> {
    const queryDb = getDb(trx);
    const rows = await queryDb('shifts')
      .insert({
        ...data,
        version: 1,
      })
      .returning('*');
    return this.findById(rows[0].id, trx) as Promise<ShiftWithRelations>;
  },

  async update(
    id: string,
    data: Partial<{
      start_time: Date;
      end_time: Date;
      location_id: string;
      required_skill_id: string;
      headcount: number;
      status: Shift['status'];
      published_at: Date;
    }>,
    trx?: Knex.Transaction
  ): Promise<ShiftWithRelations> {
    const queryDb = getDb(trx);
    await queryDb('shifts')
      .where({ id })
      .update({ ...data, updated_at: queryDb.fn.now() })
      .returning('*');
    return this.findById(id, trx) as Promise<ShiftWithRelations>;
  },

  async updateWithVersion(
    id: string,
    data: Partial<{
      start_time: Date;
      end_time: Date;
      location_id: string;
      required_skill_id: string;
      headcount: number;
      status: Shift['status'];
      published_at: Date;
    }>,
    expectedVersion: number,
    trx: Knex.Transaction
  ): Promise<{ success: boolean; error?: string; shift?: ShiftWithRelations }> {
    const current = await trx('shifts').where({ id }).select('id', 'version', 'status').first();

    if (!current) {
      return { success: false, error: 'Shift not found' };
    }

    if (current.version !== expectedVersion) {
      return {
        success: false,
        error: 'CONFLICT: Shift was modified by another user',
      };
    }

    await trx('shifts')
      .where({ id })
      .update({
        ...data,
        version: current.version + 1,
        updated_at: trx.fn.now(),
      })
      .returning('*');

    const shift = await this.findById(id, trx);
    return { success: true, shift: shift as ShiftWithRelations };
  },

  delete(id: string, trx?: Knex.Transaction): Promise<number> {
    const queryDb = getDb(trx);
    return queryDb('shifts').where({ id }).del();
  },

  deleteWithVersion(
    id: string,
    expectedVersion: number,
    trx: Knex.Transaction
  ): Promise<{ success: boolean; error?: string }> {
    return trx('shifts')
      .where({ id, version: expectedVersion })
      .del()
      .then((count) => {
        if (count === 0) {
          return {
            success: false,
            error: 'CONFLICT: Shift was modified by another user',
          };
        }
        return { success: true };
      });
  },

  count(where?: Record<string, unknown>, trx?: Knex.Transaction): Promise<number> {
    const queryDb = getDb(trx);
    const query = where ? queryDb('shifts').where(where) : queryDb('shifts');
    return query.count('*').then((r) => Number(r[0].count));
  },

  getKnex(): Knex {
    return db;
  },

  getDb(trx?: Knex.Transaction): Knex {
    return getDb(trx);
  },
};

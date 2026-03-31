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
  status?: string;
  startDate?: Date;
  endDate?: Date;
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
  'shifts.created_at',
  'shifts.updated_at',
];

export const shiftRepository = {
  findMany(filter?: ShiftFilter): Promise<ShiftWithRelations[]> {
    let query = db('shifts')
      .select(shiftSelect)
      .leftJoin('locations', 'shifts.location_id', 'locations.id')
      .leftJoin(
        'skills as required_skill',
        'shifts.required_skill_id',
        'required_skill.id',
      )
      .select(
        db.raw(
          "JSON_BUILD_OBJECT('id', locations.id, 'name', locations.name, 'timezone', locations.timezone) as location",
        ),
        db.raw(
          "JSON_BUILD_OBJECT('id', required_skill.id, 'name', required_skill.name) as required_skill",
        ),
      )
      .orderBy('shifts.start_time', 'asc');

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
        required_skill:
          row.required_skill as ShiftWithRelations['required_skill'],
        assignments: [],
      })),
    ) as Promise<ShiftWithRelations[]>;
  },

  findById(id: string): Promise<ShiftWithRelations | null> {
    return db('shifts')
      .select(shiftSelect)
      .leftJoin('locations', 'shifts.location_id', 'locations.id')
      .leftJoin(
        'skills as required_skill',
        'shifts.required_skill_id',
        'required_skill.id',
      )
      .leftJoin(
        db('shift_assignments')
          .select(
            'shift_assignments.id',
            'shift_assignments.shift_id',
            db.raw(
              "JSON_BUILD_OBJECT('id', users.id, 'name', users.name, 'email', users.email) as staff",
            ),
          )
          .leftJoin('users', 'shift_assignments.staff_id', 'users.id')
          .as('assignments'),
        'assignments.shift_id',
        'shifts.id',
      )
      .select(
        db.raw(
          "JSON_BUILD_OBJECT('id', locations.id, 'name', locations.name, 'timezone', locations.timezone) as location",
        ),
        db.raw(
          "JSON_BUILD_OBJECT('id', required_skill.id, 'name', required_skill.name) as required_skill",
        ),
        db.raw(
          "COALESCE(JSON_AGG(assignments.staff) FILTER (WHERE assignments.staff IS NOT NULL), '[]') as assignments",
        ),
      )
      .where('shifts.id', id)
      .first()
      .then((row: Record<string, unknown> | undefined) => {
        if (!row) return null;
        return {
          ...row,
          location: row.location as ShiftWithRelations['location'],
          required_skill:
            row.required_skill as ShiftWithRelations['required_skill'],
          assignments:
            (row.assignments as ShiftWithRelations['assignments']) || [],
        };
      }) as Promise<ShiftWithRelations | null>;
  },

  create(data: {
    location_id: string;
    required_skill_id: string;
    start_time: Date;
    end_time: Date;
    headcount: number;
    status: Shift['status'];
  }): Promise<ShiftWithRelations> {
    return db('shifts')
      .insert(data)
      .returning('*')
      .then((rows) => this.findById(rows[0].id)) as Promise<ShiftWithRelations>;
  },

  update(
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
  ): Promise<ShiftWithRelations> {
    return db('shifts')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*')
      .then(() => this.findById(id)) as Promise<ShiftWithRelations>;
  },

  delete(id: string): Promise<number> {
    return db('shifts').where({ id }).del();
  },

  count(where?: Record<string, unknown>): Promise<number> {
    const query = where ? db('shifts').where(where) : db('shifts');
    return query.count('*').then((r) => Number(r[0].count));
  },

  getKnex(): Knex {
    return db;
  },
};

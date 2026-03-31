import { Knex } from 'knex';
import db from '../database';

export interface SwapRequest {
  id: string;
  shift_id: string;
  requester_id: string;
  target_id: string | null;
  type: 'SWAP' | 'DROP';
  status:
    | 'PENDING'
    | 'ACCEPTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'EXPIRED';
  response_reason: string | null;
  responded_by: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface SwapVersionCheck {
  id: string;
  version: number;
  status: string;
}

export interface SwapFilter {
  status?: string;
  shiftId?: string;
  userId?: string;
}

function getDb(trx?: Knex.Transaction): Knex {
  return trx || db;
}

export const swapRepository = {
  findMany(filter?: SwapFilter, trx?: Knex.Transaction): Promise<SwapRequest[]> {
    const queryDb = getDb(trx);
    let query = queryDb('swap_requests')
      .select(
        'swap_requests.id',
        'swap_requests.shift_id',
        'swap_requests.requester_id',
        'swap_requests.target_id',
        'swap_requests.type',
        'swap_requests.status',
        'swap_requests.response_reason',
        'swap_requests.responded_by',
        'swap_requests.version',
        'swap_requests.created_at',
        'swap_requests.updated_at',
      )
      .orderBy('swap_requests.created_at', 'desc');

    if (filter?.status) {
      query = query.where('swap_requests.status', filter.status);
    }
    if (filter?.shiftId) {
      query = query.where('swap_requests.shift_id', filter.shiftId);
    }
    if (filter?.userId) {
      query = query.where(function () {
        this.where('swap_requests.requester_id', filter.userId).orWhere(
          'swap_requests.target_id',
          filter.userId,
        );
      });
    }

    return query;
  },

  findManyWithRelations(filter?: SwapFilter, trx?: Knex.Transaction): Promise<any[]> {
    const queryDb = getDb(trx);
    let query = queryDb('swap_requests')
      .select(
        'swap_requests.id',
        'swap_requests.shift_id',
        'swap_requests.requester_id',
        'swap_requests.target_id',
        'swap_requests.type',
        'swap_requests.status',
        'swap_requests.response_reason',
        'swap_requests.responded_by',
        'swap_requests.version',
        'swap_requests.created_at',
        'swap_requests.updated_at',
        db.raw("JSON_BUILD_OBJECT('id', requester.id, 'name', requester.name) as requester"),
        db.raw("JSON_BUILD_OBJECT('id', target.id, 'name', target.name) as target"),
        db.raw("JSON_BUILD_OBJECT('id', shifts.id, 'start_time', shifts.start_time, 'end_time', shifts.end_time, 'location', JSON_BUILD_OBJECT('id', locations.id, 'name', locations.name)) as shift"),
      )
      .leftJoin('users as requester', 'swap_requests.requester_id', 'requester.id')
      .leftJoin('users as target', 'swap_requests.target_id', 'target.id')
      .leftJoin('shifts', 'swap_requests.shift_id', 'shifts.id')
      .leftJoin('locations', 'shifts.location_id', 'locations.id')
      .orderBy('swap_requests.created_at', 'desc');

    if (filter?.status) {
      query = query.where('swap_requests.status', filter.status);
    }
    if (filter?.shiftId) {
      query = query.where('swap_requests.shift_id', filter.shiftId);
    }
    if (filter?.userId) {
      query = query.where(function () {
        this.where('swap_requests.requester_id', filter.userId).orWhere(
          'swap_requests.target_id',
          filter.userId,
        );
      });
    }

    return query;
  },

  findById(id: string, trx?: Knex.Transaction): Promise<SwapRequest | null> {
    const queryDb = getDb(trx);
    return queryDb('swap_requests')
      .where({ id })
      .first()
      .then((row) => row || null);
  },

  findVersion(id: string, trx?: Knex.Transaction): Promise<SwapVersionCheck | null> {
    const queryDb = getDb(trx);
    return queryDb('swap_requests')
      .where({ id })
      .select('id', 'version', 'status')
      .first()
      .then((row) => row || null);
  },

  findPendingForShift(shiftId: string, trx?: Knex.Transaction): Promise<SwapRequest[]> {
    const queryDb = getDb(trx);
    return queryDb('swap_requests')
      .where({ shift_id: shiftId })
      .whereIn('status', ['PENDING', 'ACCEPTED'])
      .select();
  },

  findPendingForUser(userId: string, trx?: Knex.Transaction): Promise<SwapRequest[]> {
    const queryDb = getDb(trx);
    return queryDb('swap_requests')
      .where(function () {
        this.where('requester_id', userId)
          .orWhere('target_id', userId);
      })
      .whereIn('status', ['PENDING', 'ACCEPTED'])
      .select();
  },

  countPendingForUser(userId: string, trx?: Knex.Transaction): Promise<number> {
    const queryDb = getDb(trx);
    return queryDb('swap_requests')
      .where(function () {
        this.where('requester_id', userId)
          .orWhere('target_id', userId);
      })
      .whereIn('status', ['PENDING', 'ACCEPTED'])
      .count('*')
      .then((r) => Number(r[0].count));
  },

  async create(
    data: {
      shift_id: string;
      requester_id: string;
      target_id?: string | null;
      type: 'SWAP' | 'DROP';
    },
    trx?: Knex.Transaction,
  ): Promise<SwapRequest> {
    const queryDb = getDb(trx);
    const rows = await queryDb('swap_requests')
      .insert({
        shift_id: data.shift_id,
        requester_id: data.requester_id,
        target_id: data.target_id || null,
        type: data.type,
        status: 'PENDING',
        version: 1,
      })
      .returning('*');
    return rows[0];
  },

  async createWithValidation(
    data: {
      shift_id: string;
      requester_id: string;
      target_id?: string | null;
      type: 'SWAP' | 'DROP';
    },
    maxPendingSwaps: number,
    trx: Knex.Transaction,
  ): Promise<{ success: boolean; error?: string; swap?: SwapRequest }> {
    const [shift, requester, existingPending] = await Promise.all([
      trx('shifts').where({ id: data.shift_id }).first(),
      trx('users').where({ id: data.requester_id }).first(),
      trx('swap_requests')
        .where(function () {
          this.where('requester_id', data.requester_id)
            .orWhere('target_id', data.requester_id);
        })
        .whereIn('status', ['PENDING', 'ACCEPTED'])
        .count('*')
        .first(),
    ]);

    if (!shift) {
      return { success: false, error: 'Shift not found' };
    }

    if (!requester) {
      return { success: false, error: 'User not found' };
    }

    if (existingPending && Number(existingPending.count) >= maxPendingSwaps) {
      return { success: false, error: `Maximum ${maxPendingSwaps} pending swap requests allowed` };
    }

    if (data.type === 'DROP' && !data.target_id) {
      const hoursUntilShift = new Date(shift.start_time).getTime() - Date.now();
      const hours = hoursUntilShift / (1000 * 60 * 60);
      if (hours < 24) {
        return { success: false, error: 'Cannot drop shift with less than 24h notice' };
      }
    }

    const rows = await trx('swap_requests')
      .insert({
        shift_id: data.shift_id,
        requester_id: data.requester_id,
        target_id: data.target_id || null,
        type: data.type,
        status: 'PENDING',
        version: 1,
      })
      .returning('*');

    return { success: true, swap: rows[0] };
  },

  async update(
    id: string,
    data: Partial<
      Pick<
        SwapRequest,
        'status' | 'target_id' | 'responded_by' | 'response_reason'
      >
    >,
    trx?: Knex.Transaction,
  ): Promise<SwapRequest> {
    const queryDb = getDb(trx);
    const rows = await queryDb('swap_requests')
      .where({ id })
      .update({ ...data, updated_at: queryDb.fn.now() })
      .returning('*');
    return rows[0];
  },

  async updateWithVersion(
    id: string,
    data: Partial<
      Pick<
        SwapRequest,
        'status' | 'target_id' | 'responded_by' | 'response_reason'
      >
    >,
    expectedVersion: number,
    trx: Knex.Transaction,
  ): Promise<{ success: boolean; error?: string; swap?: SwapRequest }> {
    const current = await trx('swap_requests')
      .where({ id })
      .select('id', 'version', 'status')
      .first();

    if (!current) {
      return { success: false, error: 'Swap request not found' };
    }

    if (current.version !== expectedVersion) {
      return { success: false, error: 'CONFLICT: Swap request was modified by another user' };
    }

    const rows = await trx('swap_requests')
      .where({ id })
      .update({
        ...data,
        version: current.version + 1,
        updated_at: trx.fn.now(),
      })
      .returning('*');

    return { success: true, swap: rows[0] };
  },

  async updateStatusWithValidation(
    id: string,
    newStatus: SwapRequest['status'],
    respondedBy: string,
    reason?: string,
    trx?: Knex.Transaction,
  ): Promise<{ success: boolean; error?: string; swap?: SwapRequest }> {
    const current = await (trx || db)('swap_requests')
      .where({ id })
      .select('*')
      .first();

    if (!current) {
      return { success: false, error: 'Swap request not found' };
    }

    const validTransitions: Record<string, string[]> = {
      PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
      ACCEPTED: ['APPROVED', 'CANCELLED'],
    };

    const allowed = validTransitions[current.status] || [];
    if (!allowed.includes(newStatus)) {
      return { success: false, error: `Cannot transition from ${current.status} to ${newStatus}` };
    }

    const rows = await (trx || db)('swap_requests')
      .where({ id })
      .update({
        status: newStatus,
        responded_by: respondedBy,
        response_reason: reason || null,
        version: current.version + 1,
        updated_at: (trx || db).fn.now(),
      })
      .returning('*');

    return { success: true, swap: rows[0] };
  },

  delete(id: string, trx?: Knex.Transaction): Promise<number> {
    const queryDb = getDb(trx);
    return queryDb('swap_requests').where({ id }).del();
  },

  getKnex(): Knex {
    return db;
  },

  getDb(trx?: Knex.Transaction): Knex {
    return getDb(trx);
  },
};

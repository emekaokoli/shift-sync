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
  created_at: Date;
  updated_at: Date;
}

export interface SwapFilter {
  status?: string;
  shiftId?: string;
  userId?: string;
}

export const swapRepository = {
  findMany(filter?: SwapFilter): Promise<SwapRequest[]> {
    let query = db('swap_requests')
      .select(
        'swap_requests.id',
        'swap_requests.shift_id',
        'swap_requests.requester_id',
        'swap_requests.target_id',
        'swap_requests.type',
        'swap_requests.status',
        'swap_requests.response_reason',
        'swap_requests.responded_by',
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

  findById(id: string): Promise<SwapRequest | null> {
    return db('swap_requests')
      .where({ id })
      .first()
      .then((row) => row || null);
  },

  create(data: {
    shift_id: string;
    requester_id: string;
    target_id?: string | null;
    type: 'SWAP' | 'DROP';
  }): Promise<SwapRequest> {
    return db('swap_requests')
      .insert({
        shift_id: data.shift_id,
        requester_id: data.requester_id,
        target_id: data.target_id || null,
        type: data.type,
        status: 'PENDING',
      })
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(
    id: string,
    data: Partial<
      Pick<
        SwapRequest,
        'status' | 'target_id' | 'responded_by' | 'response_reason'
      >
    >,
  ): Promise<SwapRequest> {
    return db('swap_requests')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: string): Promise<number> {
    return db('swap_requests').where({ id }).del();
  },

  getKnex(): Knex {
    return db;
  },
};

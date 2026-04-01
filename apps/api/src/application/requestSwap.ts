import { Knex } from 'knex';
import { CONSTRAINTS } from '@shift-sync/shared';
import dayjs from 'dayjs';
import { createAuditLog } from './auditLog';
import db from '../infrastructure/database';

interface RequestSwapParams {
  shiftId: string;
  requesterId: string;
  targetId?: string;
}

export async function requestSwap({
  shiftId,
  requesterId,
  targetId,
}: RequestSwapParams): Promise<{
  success: boolean;
  swap?: unknown;
  error?: string;
}> {
  const pendingCount = await db('swap_requests')
    .where('requester_id', requesterId)
    .whereIn('status', ['PENDING', 'ACCEPTED'])
    .count('*')
    .first();

  if (pendingCount && Number(pendingCount.count) >= CONSTRAINTS.MAX_PENDING_SWAPS) {
    return {
      success: false,
      error: `Maximum ${CONSTRAINTS.MAX_PENDING_SWAPS} pending swap/drop requests allowed`,
    };
  }

  const shift = await db('shifts').where({ id: shiftId }).first();

  if (!shift) {
    return { success: false, error: 'Shift not found' };
  }

  const hoursUntilShift = dayjs(shift.start_time).diff(dayjs(), 'hour');

  if (!targetId && hoursUntilShift < CONSTRAINTS.DROP_EXPIRY_HOURS) {
    return {
      success: false,
      error: `Cannot drop shift with less than ${CONSTRAINTS.DROP_EXPIRY_HOURS}h notice`,
    };
  }

  const currentAssignment = await db('shift_assignments')
    .where({ shift_id: shiftId, staff_id: requesterId })
    .first();

  if (!currentAssignment) {
    return { success: false, error: 'You are not assigned to this shift' };
  }

  try {
    const swap = await db.transaction(async (trx: Knex.Transaction) => {
      const [newSwap] = await trx('swap_requests')
        .insert({
          shift_id: shiftId,
          requester_id: requesterId,
          target_id: targetId || null,
          type: targetId ? 'SWAP' : 'DROP',
          status: 'PENDING',
        })
        .returning('*');

      await createAuditLog(trx, {
        userId: requesterId,
        action: targetId ? 'REQUEST_SWAP' : 'REQUEST_DROP',
        entityType: 'SwapRequest',
        entityId: newSwap.id,
        newValue: targetId ? { shiftId, targetId } : { shiftId },
      });

      return newSwap;
    });

    return { success: true, swap };
  } catch {
    return { success: false, error: 'Failed to create swap request' };
  }
}

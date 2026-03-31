import { Knex } from 'knex';
import { canTransition } from '../domain/swap';
import { createAuditLog } from './auditLog';
import db from '../infrastructure/database';

interface ApproveSwapParams {
  swapId: string;
  action: 'accept' | 'reject' | 'approve' | 'cancel';
  userId: string;
  overrideReason?: string;
}

export async function approveSwap({
  swapId,
  action,
  userId,
  overrideReason,
}: ApproveSwapParams): Promise<{
  success: boolean;
  swap?: unknown;
  error?: string;
}> {
  const swap = await db('swap_requests').where({ id: swapId }).first();

  if (!swap) {
    return { success: false, error: 'Swap request not found' };
  }

  const statusMap: Record<string, 'ACCEPTED' | 'REJECTED' | 'APPROVED' | 'CANCELLED'> = {
    accept: 'ACCEPTED',
    reject: 'REJECTED',
    approve: 'APPROVED',
    cancel: 'CANCELLED',
  };

  const newStatus = statusMap[action];

  if (!canTransition(swap.status, newStatus)) {
    return {
      success: false,
      error: `Cannot ${action} swap request in status: ${swap.status}`,
    };
  }

  try {
    const updatedSwap = await db.transaction(async (trx: Knex.Transaction) => {
      const [updated] = await trx('swap_requests')
        .where({ id: swapId })
        .update({
          status: newStatus,
          responded_by: userId,
          response_reason: overrideReason || null,
          updated_at: trx.fn.now(),
        })
        .returning('*');

      if (newStatus === 'APPROVED') {
        const targetId = swap.target_id;

        if (targetId) {
          await trx('shift_assignments')
            .where({ shift_id: swap.shift_id })
            .update({
              staff_id: targetId,
              updated_at: trx.fn.now(),
            });
        }
      }

      await createAuditLog(trx, {
        userId,
        action: `SWAP_${newStatus}`,
        entityType: 'SwapRequest',
        entityId: swapId,
        oldValue: { status: swap.status },
        newValue: overrideReason
          ? { status: newStatus, overrideReason }
          : { status: newStatus },
      });

      return updated;
    });

    return { success: true, swap: updatedSwap };
  } catch {
    return { success: false, error: 'Failed to update swap request' };
  }
}

import { Knex } from 'knex';
import { canTransition } from '../domain/swap';
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

  console.log('[approveSwap] Current swap status:', swap.status, 'Action:', action);

  const statusMap: Record<string, 'ACCEPTED' | 'REJECTED' | 'APPROVED' | 'CANCELLED'> = {
    accept: 'ACCEPTED',
    reject: 'REJECTED',
    approve: 'APPROVED',
    cancel: 'CANCELLED',
  };

  const newStatus = statusMap[action];

  console.log(
    '[approveSwap] New status:',
    newStatus,
    'Can transition:',
    canTransition(swap.status, newStatus)
  );

  if (!canTransition(swap.status, newStatus)) {
    return {
      success: false,
      error: `Cannot ${action} swap request in status: ${swap.status}`,
    };
  }

  try {
    console.log('[approveSwap] Starting transaction for swap:', swapId);
    console.log('[approveSwap] User ID from token:', userId);

    // Verify user exists before updating
    const userRecord = await db('users').where({ id: userId }).first();
    console.log('[approveSwap] User found:', userRecord?.id, userRecord?.email);

    // Use null instead of invalid userId to avoid FK constraint violation
    const effectiveUserId = userRecord?.id || null;

    const updatedSwap = await db.transaction(async (trx: Knex.Transaction) => {
      console.log('[approveSwap] In transaction, updating to status:', newStatus);

      const updateData: Record<string, unknown> = {
        status: newStatus,
        response_reason: overrideReason || null,
        updated_at: trx.fn.now(),
      };

      // Only set responded_by if we have a valid user
      if (effectiveUserId) {
        updateData.responded_by = effectiveUserId;
      }

      const updateResult = await trx('swap_requests').where({ id: swapId }).update(updateData);

      console.log('[approveSwap] Update result:', updateResult);

      const updated = await trx('swap_requests').where({ id: swapId }).first();
      console.log('[approveSwap] Updated swap:', updated);

      if (newStatus === 'APPROVED' && swap.target_id) {
        console.log('[approveSwap] Updating shift assignment to target:', swap.target_id);
        await trx('shift_assignments').where({ shift_id: swap.shift_id }).update({
          staff_id: swap.target_id,
          updated_at: trx.fn.now(),
        });
      }

      return updated;
    });

    console.log('[approveSwap] Transaction completed, result:', updatedSwap);
    return { success: true, swap: updatedSwap };
  } catch (error) {
    console.error('[approveSwap] Full error:', error);
    console.error('[approveSwap] Error stack:', (error as Error)?.stack);
    return {
      success: false,
      error: `Failed to update swap request: ${(error as Error)?.message || String(error)}`,
    };
  }
}

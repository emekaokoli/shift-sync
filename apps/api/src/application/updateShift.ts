import { Knex } from 'knex';
import { createAuditLog } from './auditLog';
import db from '../infrastructure/database';

interface UpdateShiftParams {
  shiftId: string;
  updates: {
    start_time?: Date;
    end_time?: Date;
    location_id?: string;
    required_skill_id?: string;
    headcount?: number;
    status?: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
    published_at?: Date;
  };
  userId: string;
}

export async function updateShift({ shiftId, updates, userId }: UpdateShiftParams): Promise<{
  success: boolean;
  shift?: unknown;
  error?: string;
  cancelledSwaps?: unknown[];
}> {
  try {
    const result = await db.transaction(async (trx: Knex.Transaction) => {
      const currentShift = await trx('shifts').where({ id: shiftId }).first();

      if (!currentShift) {
        throw new Error('Shift not found');
      }

      const [updatedShift] = await trx('shifts')
        .where({ id: shiftId })
        .update({
          ...updates,
          updated_at: trx.fn.now(),
        })
        .returning('*');

      await createAuditLog(trx, {
        userId,
        action: 'UPDATE_SHIFT',
        entityType: 'Shift',
        entityId: shiftId,
        oldValue: {
          start_time: currentShift.start_time,
          end_time: currentShift.end_time,
          status: currentShift.status,
        },
        newValue: {
          start_time: updatedShift.start_time,
          end_time: updatedShift.end_time,
          status: updatedShift.status,
        },
      });

      const cancelledSwaps: unknown[] = [];

      if (updates.start_time || updates.end_time || updates.location_id) {
        const pendingSwaps = await trx('swap_requests').where({
          shift_id: shiftId,
          status: 'PENDING',
        });

        if (pendingSwaps.length > 0) {
          await trx('swap_requests')
            .whereIn(
              'id',
              pendingSwaps.map((s) => s.id)
            )
            .update({ status: 'CANCELLED', updated_at: trx.fn.now() });

          for (const swap of pendingSwaps) {
            await createAuditLog(trx, {
              userId,
              action: 'SWAP_AUTO_CANCELLED',
              entityType: 'SwapRequest',
              entityId: swap.id,
              newValue: { reason: 'Shift was modified' },
            });
          }

          cancelledSwaps.push(...pendingSwaps);
        }
      }

      return { shift: updatedShift, cancelledSwaps };
    });

    return {
      success: true,
      shift: result.shift,
      cancelledSwaps: result.cancelledSwaps,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update shift',
    };
  }
}

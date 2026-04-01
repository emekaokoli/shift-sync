import { Knex } from 'knex';
import { createAuditLog } from './auditLog';
import db from '../infrastructure/database';

interface CreateShiftParams {
  location_id: string;
  required_skill_id: string;
  start_time: Date;
  end_time: Date;
  headcount: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  userId: string;
}

export async function createShift({
  location_id,
  required_skill_id,
  start_time,
  end_time,
  headcount,
  status,
  userId,
}: CreateShiftParams): Promise<{
  success: boolean;
  shift?: unknown;
  error?: string;
}> {
  try {
    const result = await db.transaction(async (trx: Knex.Transaction) => {
      const [newShift] = await trx('shifts')
        .insert({
          location_id,
          required_skill_id,
          start_time,
          end_time,
          headcount,
          status,
          version: 1,
        })
        .returning('*');

      await createAuditLog(trx, {
        userId,
        action: 'CREATE_SHIFT',
        entityType: 'Shift',
        entityId: newShift.id,
        newValue: {
          location_id,
          required_skill_id,
          start_time,
          end_time,
          headcount,
          status,
        },
      });

      return newShift;
    });

    return {
      success: true,
      shift: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create shift',
    };
  }
}

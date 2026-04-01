import { Knex } from 'knex';
import { createAuditLog } from './auditLog';
import db from '../infrastructure/database';

interface AssignShiftParams {
  shiftId: string;
  staffId: string;
  assignedBy: string;
  version?: number;
  override?: {
    reason: string;
    managerId: string;
  };
}

interface AssignShiftResult {
  success: boolean;
  assignment?: unknown;
  error?: string;
  conflictsWith?: string;
}

export async function assignShift({
  shiftId,
  staffId,
  assignedBy,
  version,
  override,
}: AssignShiftParams): Promise<AssignShiftResult> {
  try {
    const result = await db.transaction(async (trx: Knex.Transaction) => {
      const current = await trx('shift_assignments').where({ shift_id: shiftId }).first();

      if (current && version !== undefined && current.version !== version) {
        throw new Error('CONFLICT: Shift was modified by another user');
      }

      let assignment;
      if (current) {
        [assignment] = await trx('shift_assignments')
          .where({ id: current.id })
          .update({
            staff_id: staffId,
            assigned_by: assignedBy,
            version: current.version + 1,
            updated_at: trx.fn.now(),
          })
          .returning('*');
      } else {
        [assignment] = await trx('shift_assignments')
          .insert({
            shift_id: shiftId,
            staff_id: staffId,
            assigned_by: assignedBy,
            version: 1,
          })
          .returning('*');
      }

      if (override) {
        await createAuditLog(trx, {
          userId: assignedBy,
          action: 'ASSIGN_WITH_OVERRIDE',
          entityType: 'ShiftAssignment',
          entityId: assignment.id,
          oldValue: { staffId: current?.staff_id },
          newValue: { staffId, shiftId, overrideReason: override.reason, overrideManagerId: override.managerId },
        });
      } else {
        await createAuditLog(trx, {
          userId: assignedBy,
          action: 'ASSIGN_STAFF',
          entityType: 'ShiftAssignment',
          entityId: assignment.id,
          newValue: { staffId, shiftId },
        });
      }

      return assignment;
    });

    return { success: true, assignment: result };
  } catch (error) {
    if (error instanceof Error && error.message.includes('CONFLICT')) {
      return {
        success: false,
        error: error.message,
        conflictsWith: 'another_manager',
      };
    }
    throw error;
  }
}

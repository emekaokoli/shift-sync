import { PrismaClient, ShiftAssignment } from "@prisma/client";
import { validateAssignment } from "../domain/engine";
import { createAuditLog } from "./auditLog";

interface AssignShiftParams {
  db: PrismaClient;
  shiftId: string;
  staffId: string;
  assignedBy: string;
  version?: number;
}

interface AssignShiftResult {
  success: boolean;
  assignment?: ShiftAssignment;
  error?: string;
  conflictsWith?: string;
}

export async function assignShift({
  db,
  shiftId,
  staffId,
  assignedBy,
  version,
}: AssignShiftParams): Promise<AssignShiftResult> {
  // Validate assignment constraints
  const validation = await validateAssignment({ db, staffId, shiftId });

  if (!validation.ok) {
    return {
      success: false,
      error: validation.violations.map((v) => v.message).join("; "),
    };
  }

  // Use transaction with optimistic locking
  try {
    const result = await db.$transaction(async (tx) => {
      // Get current assignment with version
      const current = await tx.shiftAssignment.findFirst({
        where: { shiftId },
      });

      // Version check for optimistic locking
      if (current && version !== undefined && current.version !== version) {
        throw new Error("CONFLICT: Shift was modified by another user");
      }

      // Create or update assignment
      const assignment = current
        ? await tx.shiftAssignment.update({
            where: { id: current.id },
            data: {
              staffId,
              assignedBy,
              version: current.version + 1,
            },
          })
        : await tx.shiftAssignment.create({
            data: {
              shiftId,
              staffId,
              assignedBy,
              version: 1,
            },
          });

      // Create audit log
      await createAuditLog(tx, {
        userId: assignedBy,
        action: "ASSIGN_STAFF",
        entityType: "ShiftAssignment",
        entityId: assignment.id,
        newValue: { staffId, shiftId },
      });

      return assignment;
    });

    return { success: true, assignment: result };
  } catch (error) {
    if (error instanceof Error && error.message.includes("CONFLICT")) {
      return {
        success: false,
        error: error.message,
        conflictsWith: "another_manager",
      };
    }
    throw error;
  }
}

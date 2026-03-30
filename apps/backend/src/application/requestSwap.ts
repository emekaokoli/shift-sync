import type { SwapRequest } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { CONSTRAINTS } from "@shift-sync/shared";
import dayjs from "dayjs";
import { createAuditLog } from "./auditLog";

interface RequestSwapParams {
  db: PrismaClient;
  shiftId: string;
  requesterId: string;
  targetId?: string;
}

export async function requestSwap({
  db,
  shiftId,
  requesterId,
  targetId,
}: RequestSwapParams): Promise<{
  success: boolean;
  swap?: SwapRequest;
  error?: string;
}> {
  // Check pending request count
  const pendingCount = await db.swapRequest.count({
    where: {
      OR: [
        { requesterId, status: { in: ["PENDING", "ACCEPTED"] } },
        { targetId: requesterId, status: { in: ["PENDING", "ACCEPTED"] } },
      ],
    },
  });

  if (pendingCount >= CONSTRAINTS.MAX_PENDING_SWAPS) {
    return {
      success: false,
      error: `Maximum ${CONSTRAINTS.MAX_PENDING_SWAPS} pending swap/drop requests allowed`,
    };
  }

  // Get shift to check timing
  const shift = await db.shift.findUnique({
    where: { id: shiftId },
  });

  if (!shift) {
    return { success: false, error: "Shift not found" };
  }

  // Check if drop request (no target) is within expiry window
  const hoursUntilShift = dayjs(shift.startTime).diff(dayjs(), "hour");

  if (!targetId && hoursUntilShift < CONSTRAINTS.DROP_EXPIRY_HOURS) {
    return {
      success: false,
      error: `Cannot drop shift with less than ${CONSTRAINTS.DROP_EXPIRY_HOURS}h notice`,
    };
  }

  // Check if requester is assigned to this shift
  const currentAssignment = await db.shiftAssignment.findFirst({
    where: { shiftId, staffId: requesterId },
  });

  if (!currentAssignment) {
    return { success: false, error: "You are not assigned to this shift" };
  }

  // Create swap request
  try {
    const swap = await db.$transaction(async (tx) => {
      const newSwap = await tx.swapRequest.create({
        data: {
          shiftId,
          requesterId,
          targetId: targetId || null,
          status: "PENDING",
        },
      });

      await createAuditLog(tx, {
        userId: requesterId,
        action: targetId ? "REQUEST_SWAP" : "REQUEST_DROP",
        entityType: "SwapRequest",
        entityId: newSwap.id,
        newValue: targetId ? { shiftId, targetId } : { shiftId },
      });

      return newSwap;
    });

    return { success: true, swap };
  } catch {
    return { success: false, error: "Failed to create swap request" };
  }
}

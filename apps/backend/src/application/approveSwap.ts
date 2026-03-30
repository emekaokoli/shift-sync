import { PrismaClient, SwapRequest } from "@prisma/client";
import { canTransition } from "../domain/swap";
import { createAuditLog } from "./auditLog";

interface ApproveSwapParams {
  db: PrismaClient;
  swapId: string;
  action: "accept" | "reject" | "approve" | "cancel";
  userId: string;
  overrideReason?: string;
}

export async function approveSwap({
  db,
  swapId,
  action,
  userId,
  overrideReason,
}: ApproveSwapParams): Promise<{
  success: boolean;
  swap?: SwapRequest;
  error?: string;
}> {
  const swap = await db.swapRequest.findUnique({
    where: { id: swapId },
    include: {
      shift: true,
      requester: true,
      target: true,
    },
  });

  if (!swap) {
    return { success: false, error: "Swap request not found" };
  }

  // Determine target status based on action
  const statusMap: Record<
    string,
    "ACCEPTED" | "REJECTED" | "APPROVED" | "CANCELLED"
  > = {
    accept: "ACCEPTED",
    reject: "REJECTED",
    approve: "APPROVED",
    cancel: "CANCELLED",
  };

  const newStatus = statusMap[action];

  // Validate transition
  if (!canTransition(swap.status, newStatus)) {
    return {
      success: false,
      error: `Cannot ${action} swap request in status: ${swap.status}`,
    };
  }

  // For approve action, require override reason if it's a 7th day or overtime
  if (action === "approve" && overrideReason) {
    // Log the override reason in audit
  }

  try {
    const updatedSwap = await db.$transaction(async (tx) => {
      const updated = await tx.swapRequest.update({
        where: { id: swapId },
        data: { status: newStatus },
      });

      // If approved, also update the shift assignment
      if (newStatus === "APPROVED") {
        const targetId = swap.targetId;

        if (targetId) {
          // Swap: reassign to target
          await tx.shiftAssignment.updateMany({
            where: { shiftId: swap.shiftId },
            data: { staffId: targetId },
          });
        }
        // If no target (drop), the shift becomes available (assignment stays removed)
      }

      await createAuditLog(tx, {
        userId,
        action: `SWAP_${newStatus}`,
        entityType: "SwapRequest",
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
    return { success: false, error: "Failed to update swap request" };
  }
}

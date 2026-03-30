import { PrismaClient, Shift, SwapRequest } from "@prisma/client";
import { createAuditLog } from "./auditLog";

interface UpdateShiftParams {
  db: PrismaClient;
  shiftId: string;
  updates: {
    startTime?: Date;
    endTime?: Date;
    locationId?: string;
    requiredSkillId?: string;
    headcount?: number;
    status?: "DRAFT" | "PUBLISHED" | "CANCELLED";
  };
  userId: string;
}

export async function updateShift({
  db,
  shiftId,
  updates,
  userId,
}: UpdateShiftParams): Promise<{
  success: boolean;
  shift?: Shift;
  error?: string;
  cancelledSwaps?: SwapRequest[];
}> {
  try {
    const result = await db.$transaction(async (tx) => {
      // Get current shift
      const currentShift = await tx.shift.findUnique({
        where: { id: shiftId },
        include: {
          swapRequests: {
            where: { status: "PENDING" },
          },
        },
      });

      if (!currentShift) {
        throw new Error("Shift not found");
      }

      // Update shift
      const updatedShift = await tx.shift.update({
        where: { id: shiftId },
        data: updates,
      });

      // Create audit log
      await createAuditLog(tx, {
        userId,
        action: "UPDATE_SHIFT",
        entityType: "Shift",
        entityId: shiftId,
        oldValue: {
          startTime: currentShift.startTime.toISOString(),
          endTime: currentShift.endTime.toISOString(),
          status: currentShift.status,
        },
        newValue: {
          startTime: updatedShift.startTime.toISOString(),
          endTime: updatedShift.endTime.toISOString(),
          status: updatedShift.status,
        },
      });

      // Cancel pending swaps if shift time/location changed significantly
      const cancelledSwaps: SwapRequest[] = [];

      if (updates.startTime || updates.endTime || updates.locationId) {
        const pendingSwaps = currentShift.swapRequests.filter(
          (s) => s.status === "PENDING",
        );

        if (pendingSwaps.length > 0) {
          await tx.swapRequest.updateMany({
            where: {
              id: { in: pendingSwaps.map((s) => s.id) },
            },
            data: { status: "CANCELLED" },
          });

          // Log each cancellation
          for (const swap of pendingSwaps) {
            await createAuditLog(tx, {
              userId,
              action: "SWAP_AUTO_CANCELLED",
              entityType: "SwapRequest",
              entityId: swap.id,
              newValue: { reason: "Shift was modified" },
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
      error: error instanceof Error ? error.message : "Failed to update shift",
    };
  }
}

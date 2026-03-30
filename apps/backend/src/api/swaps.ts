import { swapRequestSchema, swapResponseSchema } from "@shift-sync/shared";
import { Request, Response, Router } from "express";
import { z } from "zod";
import { approveSwap } from "../application/approveSwap";
import { requestSwap } from "../application/requestSwap";
import { swapRepository } from "../infrastructure/repositories";
import { ResponseUtils } from "../infrastructure/response";

const router: Router = Router();

const getQueryString = (
  value: string | string[] | undefined,
): string | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, userId, shiftId } = req.query;

    const swaps = await swapRepository.findMany({
      status: getQueryString(status),
      shiftId: getQueryString(shiftId),
      userId: getQueryString(userId),
    });

    return ResponseUtils.success(
      res,
      swaps,
      "Swap requests fetched successfully",
    );
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const swap = await swapRepository.findById(req.params.id as string);

    if (!swap) {
      return ResponseUtils.notFound(res, "Swap request not found");
    }

    return ResponseUtils.success(
      res,
      swap,
      "Swap request fetched successfully",
    );
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const data = swapRequestSchema.parse(req.body);
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      return ResponseUtils.unauthorized(res, "User ID required");
    }

    const result = await requestSwap({
      db: swapRepository.getPrismaClient(),
      shiftId: data.shiftId,
      requesterId: userId,
      targetId: data.targetId,
    });

    if (!result.success) {
      return ResponseUtils.error(
        res,
        result.error || "Failed to create swap request",
        400,
      );
    }

    const swap = await swapRepository.findById(result.swap!.id);
    return ResponseUtils.created(
      res,
      swap,
      "Swap request created successfully",
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseUtils.validationError(
        res,
        "Validation failed",
        error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", "),
      );
    }
    return ResponseUtils.handleError(res, error);
  }
});

router.post("/:id/respond", async (req: Request, res: Response) => {
  try {
    const { action } = swapResponseSchema.parse(req.body);
    const userId = req.headers["x-user-id"] as string;
    const overrideReason = req.headers["x-override-reason"] as
      | string
      | undefined;

    if (!userId) {
      return ResponseUtils.unauthorized(res, "User ID required");
    }

    const result = await approveSwap({
      db: swapRepository.getPrismaClient(),
      swapId: req.params.id as string,
      action,
      userId,
      overrideReason,
    });

    if (!result.success) {
      return ResponseUtils.error(
        res,
        result.error || "Failed to respond to swap request",
        400,
      );
    }

    return ResponseUtils.success(
      res,
      result.swap,
      "Swap request responded successfully",
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseUtils.validationError(
        res,
        "Validation failed",
        error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", "),
      );
    }
    return ResponseUtils.handleError(res, error);
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      return ResponseUtils.unauthorized(res, "User ID required");
    }

    const swap = await swapRepository.findById(req.params.id as string);

    if (!swap) {
      return ResponseUtils.notFound(res, "Swap request not found");
    }

    if (swap.requesterId !== userId) {
      return ResponseUtils.forbidden(
        res,
        "Not authorized to cancel this request",
      );
    }

    if (swap.status !== "PENDING") {
      return ResponseUtils.error(res, "Can only cancel pending requests", 400);
    }

    await swapRepository.update(req.params.id as string, {
      status: "CANCELLED",
    });

    return ResponseUtils.noContent(res, "Swap request cancelled successfully");
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

export default router;

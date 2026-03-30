import {
  assignShiftSchema,
  shiftSchema,
  shiftUpdateSchema,
} from "@shift-sync/shared";
import { Request, Response, Router } from "express";
import { z } from "zod";
import { assignShift } from "../application/assignShift";
import { updateShift } from "../application/updateShift";
import { suggestAlternatives, validateAssignment } from "../domain/engine";
import { shiftRepository } from "../infrastructure/repositories";
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
    const { locationId, status, startDate, endDate } = req.query;

    const shifts = await shiftRepository.findMany({
      locationId: getQueryString(locationId),
      status: getQueryString(status),
      startDate: getQueryString(startDate)
        ? new Date(getQueryString(startDate)!)
        : undefined,
      endDate: getQueryString(endDate)
        ? new Date(getQueryString(endDate)!)
        : undefined,
    });

    return ResponseUtils.success(res, shifts, "Shifts fetched successfully");
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const shift = await shiftRepository.findById(req.params.id as string);

    if (!shift) {
      return ResponseUtils.notFound(res, "Shift not found");
    }

    return ResponseUtils.success(res, shift, "Shift fetched successfully");
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const data = shiftSchema.parse(req.body);

    const shift = await shiftRepository.create({
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    });

    return ResponseUtils.created(res, shift, "Shift created successfully");
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

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const data = shiftUpdateSchema.parse(req.body);
    const userId = (req.headers["x-user-id"] as string) || "system";

    const updates: {
      startTime?: Date;
      endTime?: Date;
      locationId?: string;
      requiredSkillId?: string;
      headcount?: number;
      status?: "DRAFT" | "PUBLISHED" | "CANCELLED";
    } = {
      locationId: data.locationId,
      requiredSkillId: data.requiredSkillId,
      headcount: data.headcount,
    };

    if (data.status !== undefined) {
      updates.status = data.status;
    }
    if (data.startTime) {
      updates.startTime = new Date(data.startTime);
    }
    if (data.endTime) {
      updates.endTime = new Date(data.endTime);
    }

    const result = await updateShift({
      db: shiftRepository.getPrismaClient(),
      shiftId: req.params.id as string,
      updates,
      userId,
    });

    if (!result.success) {
      return ResponseUtils.error(
        res,
        result.error || "Failed to update shift",
        400,
      );
    }

    return ResponseUtils.success(
      res,
      result.shift,
      "Shift updated successfully",
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
    await shiftRepository.delete(req.params.id as string);
    return ResponseUtils.noContent(res, "Shift deleted successfully");
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post("/:id/publish", async (req: Request, res: Response) => {
  try {
    const shift = await shiftRepository.update(req.params.id as string, {
      status: "PUBLISHED",
      publishedAt: new Date(),
    });

    return ResponseUtils.success(res, shift, "Shift published successfully");
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post("/:id/assign", async (req: Request, res: Response) => {
  try {
    const { staffId, version } = assignShiftSchema.parse(req.body);
    const assignedBy = (req.headers["x-user-id"] as string) || "system";

    const result = await assignShift({
      db: shiftRepository.getPrismaClient(),
      shiftId: req.params.id as string,
      staffId,
      assignedBy,
      version,
    });

    if (!result.success) {
      return ResponseUtils.error(
        res,
        result.error || "Failed to assign staff",
        400,
      );
    }

    const shift = await shiftRepository.findById(req.params.id as string);
    return ResponseUtils.success(res, shift, "Staff assigned successfully");
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

router.post("/:id/validate", async (req: Request, res: Response) => {
  try {
    const { staffId } = req.body;
    if (!staffId) {
      return ResponseUtils.validationError(res, "staffId is required");
    }

    const result = await validateAssignment({
      db: shiftRepository.getPrismaClient(),
      staffId,
      shiftId: req.params.id as string,
    });

    if (!result.ok) {
      const suggestions = await suggestAlternatives({
        db: shiftRepository.getPrismaClient(),
        shiftId: req.params.id as string,
      });
      return ResponseUtils.success(
        res,
        { ...result, suggestions },
        "Validation failed",
      );
    }

    return ResponseUtils.success(res, result, "Validation successful");
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get("/:id/suggestions", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(getQueryString(req.query.limit) || "3");

    const suggestions = await suggestAlternatives({
      db: shiftRepository.getPrismaClient(),
      shiftId: req.params.id as string,
      limit,
    });

    return ResponseUtils.success(
      res,
      suggestions,
      "Suggestions fetched successfully",
    );
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

export default router;

import { availabilitySchema, userUpdateSchema } from "@shift-sync/shared";
import { Request, Response, Router } from "express";
import { z } from "zod";
import { staffRepository } from "../infrastructure/repositories";
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
    const { locationId, role, skillId } = req.query;

    const staff = await staffRepository.findMany({
      role: getQueryString(role),
      locationId: getQueryString(locationId),
      skillId: getQueryString(skillId),
    });

    return ResponseUtils.success(res, staff, "Staff fetched successfully");
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const staff = await staffRepository.findById(req.params.id as string);

    if (!staff) {
      return ResponseUtils.notFound(res, "Staff not found");
    }

    return ResponseUtils.success(res, staff, "Staff fetched successfully");
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const data = userUpdateSchema.parse(req.body);

    const staff = await staffRepository.update(req.params.id as string, data);

    return ResponseUtils.success(res, staff, "Staff updated successfully");
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

router.post("/:id/skills", async (req: Request, res: Response) => {
  try {
    const { skillId } = req.body;
    if (!skillId) {
      return ResponseUtils.validationError(res, "skillId is required");
    }

    const userSkill = await staffRepository.addSkill(
      req.params.id as string,
      skillId,
    );

    return ResponseUtils.success(res, userSkill, "Skill added successfully");
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.delete("/:id/skills/:skillId", async (req: Request, res: Response) => {
  try {
    await staffRepository.removeSkill(
      req.params.id as string,
      req.params.skillId as string,
    );
    return ResponseUtils.noContent(res, "Skill removed successfully");
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post("/:id/locations", async (req: Request, res: Response) => {
  try {
    const { locationId, isManager } = req.body;
    if (!locationId) {
      return ResponseUtils.validationError(res, "locationId is required");
    }

    const userLocation = await staffRepository.addLocation(
      req.params.id as string,
      locationId,
      isManager,
    );

    return ResponseUtils.success(
      res,
      userLocation,
      "Location added successfully",
    );
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.delete(
  "/:id/locations/:locationId",
  async (req: Request, res: Response) => {
    try {
      await staffRepository.removeLocation(
        req.params.id as string,
        req.params.locationId as string,
      );
      return ResponseUtils.noContent(res, "Location removed successfully");
    } catch (error) {
      return ResponseUtils.handleError(res, error);
    }
  },
);

router.post("/:id/availability", async (req: Request, res: Response) => {
  try {
    const data = availabilitySchema.parse(req.body);

    const availability = await staffRepository.addAvailability(
      req.params.id as string,
      {
        ...data,
        specificDate: data.specificDate || null,
      },
    );

    return ResponseUtils.created(
      res,
      availability,
      "Availability set successfully",
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

router.delete("/availability/:id", async (req: Request, res: Response) => {
  try {
    await staffRepository.deleteAvailability(req.params.id as string);
    return ResponseUtils.noContent(res, "Availability deleted successfully");
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

export default router;

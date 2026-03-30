import { locationSchema } from "@shift-sync/shared";
import { Request, Response, Router } from "express";
import { z } from "zod";
import { locationRepository } from "../infrastructure/repositories";
import { ResponseUtils } from "../infrastructure/response";

const router: Router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const locations = await locationRepository.findMany();

    return ResponseUtils.success(
      res,
      locations,
      "Locations fetched successfully",
    );
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const location = await locationRepository.findById(req.params.id);

    if (!location) {
      return ResponseUtils.notFound(res, "Location not found");
    }

    return ResponseUtils.success(
      res,
      location,
      "Location fetched successfully",
    );
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const data = locationSchema.parse(req.body);

    const location = await locationRepository.create(data);

    return ResponseUtils.created(
      res,
      location,
      "Location created successfully",
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

router.patch("/:id", async (req, res) => {
  try {
    const data = locationSchema.partial().parse(req.body);

    const location = await locationRepository.update(req.params.id, data);

    return ResponseUtils.success(
      res,
      location,
      "Location updated successfully",
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
    await locationRepository.delete(req.params.id);

    return ResponseUtils.noContent(res, "Location deleted successfully");
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

export default router;

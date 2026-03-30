import type { ErrorRequestHandler, Request, Response } from "express";
import { DomainError } from "./error";
import { ResponseUtils } from "./response";

export function errorHandler(): ErrorRequestHandler {
  return (err: unknown, _req: Request, res: Response) => {
    if (err instanceof DomainError) {
      return ResponseUtils.error(res, err.message, err.statusCode);
    }

    return ResponseUtils.error(res, "Internal server error", 500);
  };
}

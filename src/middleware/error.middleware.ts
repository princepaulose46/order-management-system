import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/errors";
import logger from "../config/logger";

/**
 * Global Express error-handling middleware.
 *
 * Catches errors thrown by controllers/services, logs them structured using Pino,
 * and returns a clean, consistent JSON error response to the client.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Extract context parameters for structured logging
  const logContext = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  };

  // 1. Handle custom application errors (NotFoundError, ValidationError, etc.)
  if (err instanceof AppError) {
    logger.warn({ err, ...logContext }, `AppError encountered: ${err.message}`);
    res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  // 2. Handle Prisma database errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error({ err, ...logContext }, `Prisma database error [${err.code}]: ${err.message}`);

    if (err.code === "P2025") {
      res.status(404).json({
        error: "Resource not found or database record missing.",
        statusCode: 404,
      });
      return;
    }
    if (err.code === "P2002") {
      res.status(409).json({
        error: "Conflict: A record with this unique constraint already exists.",
        statusCode: 409,
      });
      return;
    }
    if (err.code === "P2003") {
      res.status(400).json({
        error: "Foreign key constraint failed. Related record does not exist.",
        statusCode: 400,
      });
      return;
    }
  }

  // 3. Fallback for unexpected system/unhandled errors
  logger.error({ err, ...logContext }, "Unhandled server error caught by middleware");

  res.status(500).json({
    error: "Internal Server Error",
    statusCode: 500,
  });
};
